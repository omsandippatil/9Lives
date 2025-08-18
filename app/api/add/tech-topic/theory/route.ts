import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.TECHTOPIC_GROQ_API_KEY!,
});

interface TechTopic {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  tech_topic: number;
}

// Enhanced prompt for generating comprehensive technical theories
const createTechTheoryPrompt = (topicName: string) => `
You are a distinguished computer science professor, technology historian, and systems architect with decades of experience in both academia and industry. You have deep expertise across all areas of technology - from hardware fundamentals to cutting-edge software architectures, from networking protocols to distributed systems, from algorithms to emerging technologies. You will generate a COMPREHENSIVE, DETAILED, and TECHNICALLY RIGOROUS explanation about the technology topic provided.

**Technology Topic**: "${topicName}"

## RESPONSE FORMAT REQUIREMENTS:

Your response MUST be a comprehensive technical deep-dive that covers EVERY aspect of the technology. You have complete autonomy to decide the headings and structure based on what makes most sense for this specific technology. The response should be formatted as a detailed technical document that could serve as both a learning resource and reference material.

## MANDATORY CONTENT AREAS TO COVER:

### 📚 HISTORICAL CONTEXT & GENESIS
- **Pre-existence Era**: What technologies/methods existed before this technology was invented?
- **The Problem Landscape**: What specific technical challenges, limitations, or inefficiencies existed?
- **Innovation Catalyst**: What breakthrough, research, or technological advancement made this possible?
- **Key Pioneers**: Who were the inventors, researchers, or companies that developed this?
- **Timeline of Development**: Major milestones, versions, and evolutionary stages

### 🔧 TECHNICAL FUNDAMENTALS
- **Core Principles**: The fundamental computer science/engineering concepts underlying this technology
- **Mathematical Foundations**: Algorithms, data structures, computational complexity where relevant
- **Physical Layer**: Hardware requirements, constraints, or interactions (if applicable)
- **Theoretical Framework**: The scientific or engineering theories that this technology is built upon

### 🏗️ ARCHITECTURE & DESIGN
- **System Architecture**: Complete breakdown of how the technology is structured
- **Component Analysis**: Detailed explanation of each major component and its role
- **Data Flow**: How information moves through the system
- **Interaction Models**: How different parts communicate and coordinate
- **Design Patterns**: Common architectural patterns used in implementations

### ⚙️ IMPLEMENTATION DETAILS
- **Technical Specifications**: Standards, protocols, formats, or specifications
- **Key Algorithms**: Step-by-step explanation of critical algorithms involved
- **Data Structures**: How information is organized and stored
- **Performance Characteristics**: Time complexity, space complexity, throughput, latency
- **Resource Requirements**: Memory, CPU, network, storage considerations

### 🔄 OPERATIONAL MECHANICS
- **How It Works**: Step-by-step process of how this technology operates
- **Lifecycle Management**: Initialization, execution, maintenance, termination
- **State Management**: How the system maintains and transitions between states
- **Error Handling**: How failures are detected, handled, and recovered from
- **Optimization Strategies**: Techniques used to improve performance and efficiency

### 🌐 ECOSYSTEM & INTEGRATION
- **Technology Stack**: How this fits into broader technology ecosystems
- **Dependencies**: What other technologies or systems it relies on
- **Integration Patterns**: How it connects with other systems and technologies
- **Compatibility Matrix**: What works with it, what doesn't, and why
- **Standard Interfaces**: APIs, protocols, or standards it exposes or consumes

### 📊 PRACTICAL APPLICATIONS
- **Use Cases**: Detailed scenarios where this technology excels
- **Industry Applications**: How different industries leverage this technology
- **Implementation Examples**: Real-world examples with technical details
- **Best Practices**: Proven strategies for effective implementation
- **Common Pitfalls**: What to avoid and why

### 🔍 COMPARATIVE ANALYSIS
- **Alternative Solutions**: Other technologies that solve similar problems
- **Competitive Advantage**: Why choose this over alternatives
- **Tradeoff Analysis**: Performance vs complexity, cost vs benefit, etc.
- **Evolution Path**: How this technology evolved from or replaced previous solutions
- **Market Position**: Where this stands in the current technological landscape

### 🚀 ADVANCED CONCEPTS
- **Cutting-edge Features**: Latest developments and advanced capabilities
- **Research Frontiers**: Current areas of active research and development
- **Emerging Trends**: How this technology is evolving and adapting
- **Future Roadmap**: Anticipated developments and next-generation features
- **Innovation Opportunities**: Areas ripe for further advancement

### 💡 IMPACT & SIGNIFICANCE
- **Industry Transformation**: How this technology changed its domain
- **Economic Impact**: Cost savings, new business models, market creation
- **Technical Breakthroughs**: What new possibilities this technology enabled
- **Societal Influence**: Broader impact on how we work, communicate, or live
- **Legacy and Influence**: How this technology influenced subsequent innovations

## FORMATTING AND STYLE REQUIREMENTS:

- **IMPORTANT**: Add one appropriate emoji at the start of EVERY main heading to make the content visually engaging
- Use proper markdown formatting with multiple heading levels (##, ###, ####)
- Include code snippets, pseudocode, or technical diagrams using markdown code blocks where helpful
- Use tables for comparisons, specifications, or structured data
- Include mathematical formulas using standard notation where relevant
- Use bullet points and numbered lists for clarity and organization
- Bold important technical terms and concepts
- Create clear visual separation between major sections

## TECHNICAL DEPTH REQUIREMENTS:

- **Comprehensive Coverage**: Leave no stone unturned - cover every significant aspect
- **Technical Accuracy**: Use precise technical terminology and accurate explanations  
- **Practical Relevance**: Include real-world implementation details and considerations
- **Multi-layered Explanation**: Cover both high-level concepts and low-level implementation details
- **Cross-disciplinary**: Draw connections to related fields and technologies
- **Evidence-based**: Reference established principles, standards, and proven practices

## STRUCTURE FLEXIBILITY:

You have complete freedom to organize the content using headings that make the most sense for this specific technology. The headings provided above are guidelines - adapt, modify, merge, or create new headings as needed to best explain this particular technology. Some technologies might need more focus on hardware, others on algorithms, others on protocols, etc.

## AUDIENCE CONSIDERATION:

Write for a technical audience that includes:
- Software engineers and developers
- System architects and designers  
- Computer science students and researchers
- Technology professionals seeking deep understanding
- Anyone who needs to make informed technical decisions about this technology

The explanation should be thorough enough that someone could understand not just what this technology is, but WHY it exists, HOW it works at a deep level, and WHEN/WHERE to apply it effectively.

Remember: This should read like a comprehensive technical reference document written by a world-class expert. Make it authoritative, detailed, and practically useful while being engaging and well-structured. ALWAYS add appropriate emojis to ALL main headings for visual appeal.
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    const forceRegenerate = searchParams.get('regenerate') === 'true';
    
    // Validate API key
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Step 1: Get current tech topics counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('tech_topic')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch tech topic counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.tech_topic || 0;
    const nextTopicId = currentCount + 1;

    // Step 2: Get the next tech topic
    let query = supabase
      .from('tech_topics')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next topic based on counter
      query = query.eq('id', nextTopicId);
    } else {
      query = query.eq('id', nextTopicId);
    }

    const { data: topicsData, error: topicError } = await query;

    if (topicError) {
      console.error('Error fetching tech topic:', topicError);
      return NextResponse.json(
        { error: 'Database error while fetching tech topic', details: topicError.message },
        { status: 500 }
      );
    }

    if (!topicsData || topicsData.length === 0) {
      console.log(`No tech topic found with ID ${nextTopicId}. Current counter: ${currentCount}`);
      
      // Check if there are any topics in the table at all
      const { data: allTopics, error: countError } = await supabase
        .from('tech_topics')
        .select('id')
        .order('id', { ascending: true });
        
      if (countError) {
        return NextResponse.json(
          { error: 'Failed to check available tech topics' },
          { status: 500 }
        );
      }
      
      const totalTopics = allTopics?.length || 0;
      
      return NextResponse.json(
        { 
          error: 'No more tech topics available or topic not found',
          details: {
            requestedTopicId: nextTopicId,
            currentCounter: currentCount,
            totalTopicsInRepo: totalTopics,
            availableTopicIds: allTopics?.map(t => t.id) || []
          }
        },
        { status: 404 }
      );
    }

    const topic = topicsData[0] as TechTopic;

    // Step 3: Generate comprehensive tech theory using Groq
    const prompt = createTechTheoryPrompt(topic.name);
    console.log('Generating theory for tech topic:', topic.id, '-', topic.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a distinguished computer science professor and technology expert with deep knowledge across all areas of technology. You create comprehensive, technically rigorous explanations that serve as authoritative reference materials. Your explanations combine historical context, theoretical foundations, practical implementation details, and real-world applications. You have complete autonomy to structure your response with appropriate headings that best explain the specific technology. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging and easier to navigate."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 8192,
    });

    const generatedTheory = completion.choices[0]?.message?.content || '';

    // Step 4: Save the comprehensive theory
    const { error: updateError } = await supabase
      .from('tech_topics')
      .update({ 
        theory: generatedTheory
      })
      .eq('id', topic.id);

    if (updateError) {
      console.error('Error updating topic with theory:', updateError);
      return NextResponse.json(
        { error: 'Failed to save theory' },
        { status: 500 }
      );
    }

    // Step 5: Update counter only if processing sequentially
    if (!forceRegenerate && topic.id === nextTopicId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          tech_topic: topic.id
        })
        .eq('tech_topic', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      topicId: topic.id,
      topicName: topic.name,
      theory: generatedTheory,
      previousCount: currentCount,
      newCount: topic.id,
      theoryLength: generatedTheory.length,
      wordCount: generatedTheory.split(' ').length,
      estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
      message: 'Comprehensive tech theory generated and saved successfully'
    });

  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method for targeted topic processing
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { topicId, topicIds, batchSize = 3 } = body;
    
    // Handle batch processing
    if (topicIds && Array.isArray(topicIds)) {
      const results = [];
      
      for (const id of topicIds.slice(0, batchSize)) {
        try {
          const result = await processTechTopic(id);
          results.push(result);
        } catch (error) {
          results.push({
            topicId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: results.filter(r => r.success).length,
        totalRequested: topicIds.length,
        message: `Processed ${results.filter(r => r.success).length} out of ${topicIds.length} tech topics`
      });
    }

    // Handle single topic processing
    if (topicId) {
      const result = await processTechTopic(topicId);
      return NextResponse.json(result);
    }

    // Handle processing topics without theories
    let query = supabase
      .from('tech_topics')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: topics, error } = await query;

    if (error || !topics || topics.length === 0) {
      return NextResponse.json(
        { error: 'No tech topics without theories found' },
        { status: 404 }
      );
    }

    const results = [];
    for (const topic of topics) {
      try {
        const result = await processTechTopic(topic.id);
        results.push(result);
      } catch (error) {
        results.push({
          topicId: topic.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      batchResults: results,
      processedCount: results.filter(r => r.success).length,
      message: `Processed ${results.filter(r => r.success).length} tech topics without theories`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual tech topics
async function processTechTopic(topicId: number) {
  const { data: topicData, error: topicError } = await supabase
    .from('tech_topics')
    .select('*')
    .eq('id', topicId)
    .single();

  if (topicError || !topicData) {
    throw new Error(`Tech topic ${topicId} not found`);
  }

  const topic = topicData as TechTopic;
  
  const prompt = createTechTheoryPrompt(topic.name);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a distinguished computer science professor and technology expert creating comprehensive technical reference materials. You structure content with clear, logical headings that best explain each specific technology. Your explanations combine deep technical knowledge with practical insights. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    max_tokens: 8192,
  });

  const generatedTheory = completion.choices[0]?.message?.content || '';

  // Save the theory
  const { error: updateError } = await supabase
    .from('tech_topics')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', topicId);

  if (updateError) {
    throw new Error(`Failed to save theory for tech topic ${topicId}`);
  }

  return {
    success: true,
    topicId,
    topicName: topic.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
    message: 'Tech theory generated successfully'
  };
}

// PUT method for updating existing theories
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { topicId, regenerateTheory = false } = await request.json();
    
    if (!topicId) {
      return NextResponse.json(
        { error: 'Topic ID is required' },
        { status: 400 }
      );
    }

    if (regenerateTheory) {
      const result = await processTechTopic(topicId);
      return NextResponse.json({
        ...result,
        message: 'Tech theory regenerated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify regenerateTheory: true to update existing theory' },
      { status: 400 }
    );

  } catch (error) {
    console.error('PUT API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE method for removing topics or resetting theories
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    const { topicId, resetTheory = false, resetCounter = false } = await request.json();
    
    if (resetCounter) {
      const { error: resetError } = await supabase
        .from('questions_done')
        .update({ tech_topic: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Tech topics counter reset to 0'
      });
    }
    
    if (resetTheory && topicId) {
      const { error: resetError } = await supabase
        .from('tech_topics')
        .update({ theory: null })
        .eq('id', topicId);
      
      if (resetError) {
        throw new Error(`Failed to reset theory for topic ${topicId}`);
      }
      
      return NextResponse.json({
        success: true,
        topicId,
        message: 'Theory reset successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify topicId with resetTheory: true, or resetCounter: true' },
      { status: 400 }
    );

  } catch (error) {
    console.error('DELETE API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}