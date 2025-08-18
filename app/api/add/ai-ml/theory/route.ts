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
  apiKey: process.env.AIML_GROQ_API_KEY!,
});

interface AiMl {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  ai_ml: number;
}

// Enhanced prompt for generating comprehensive AI/ML theories
const createAiMlPrompt = (topicName: string) => `
You are a distinguished AI/ML researcher, professor, and practitioner with deep expertise in artificial intelligence, machine learning, deep learning, mathematical foundations, and cutting-edge research. You have extensive experience in both theoretical foundations and practical applications across academia and industry. You will generate a COMPREHENSIVE, MATHEMATICALLY RIGOROUS, and CONCEPTUALLY DETAILED explanation about the AI/ML topic provided.

**AI/ML Topic**: "${topicName}"

## RESPONSE FORMAT REQUIREMENTS:

Your response MUST be a comprehensive AI/ML deep-dive that covers EVERY aspect of the topic. You have complete autonomy to decide the headings and structure based on what makes most sense for this specific AI/ML concept. The response should be formatted as a detailed academic and practical guide that could serve as both a learning resource and implementation reference.

## MANDATORY CONTENT AREAS TO COVER:

### 📚 CONCEPTUAL FOUNDATION & CONTEXT
- **Concept (Precise Definition)**: Formal, technical definition using standard notation. — **(Essential)** (mathematical precision; one-line + formal equation if possible)
- **Problem Domain**: The class of ML problems it addresses (classification, density estimation, control, etc.). — **(Essential)**
- **What Problem Is Solved (Outcome)**: Concrete mapping from concept → measurable outcome (e.g., reduce error from X→Y, enable sample-efficient learning). — **(Essential)**
- **How It Solves the Problem (Mechanism)**: Intuitive + formal explanation of the mechanism (one-paragraph + key equations). — **(Essential)**
- **What's Unique / Differentiators**: Distinctive assumptions, guarantees, or capabilities vs alternatives. — **(Essential / Concise)**
- **Historical Context & Lineage**: Short timeline of origins, major breakthroughs, and seminal papers. — **(Useful)**
- **Relationship to Other Concepts**: Dependencies and conceptual neighbors (e.g., link to optimization/regularization/representation). — **(Essential)**
- **Prerequisites & Assumptions**: Required math/ML background and explicit problem assumptions. — **(Essential)**
- **User/Task Personas**: Typical use-cases and stakeholders (researchers vs engineers). — **(Useful)**
- **Glossary: Key Terms & Notation**: Symbols, abbreviations, and conventions used in the document. — **(Essential)**

### 🧮 MATHEMATICAL FOUNDATIONS
- **Required Math Background**: Linear algebra, probability, stats, optimization prerequisites. — **(Essential)**
- **Core Formulations**: Central equations, objective functions, probabilistic models — with brief derivations. — **(Essential)**
- **Optimization Landscape**: Loss geometry, convexity/non-convexity, stationary points. — **(Essential)**
- **Probabilistic Foundations**: Likelihoods, priors, Bayesian view (if applicable). — **(Essential / If applicable)**
- **Linear Algebra & Calculus Details**: Matrix/vector ops, Jacobians, Hessians, chain rule usage. — **(Essential / If applicable)**
- **Information-Theoretic View**: Entropy, KL, mutual information where relevant. — **(Useful)**
- **Key Proofs & Bounds**: Short proofs or references for convergence/bounds. — **(Useful / For rigorous study)**

### 🔬 THEORETICAL FRAMEWORK
- **Algorithmic Foundation**: Formal statement of core algorithm(s) and update rules. — **(Essential)**
- **Guarantees & Bounds**: Convergence rates, sample complexity, generalization bounds. — **(Essential)** 
- **Assumptions & Applicability Conditions**: When the guarantees hold and required regularity conditions. — **(Essential)**
- **Limitations & Failure Modes**: Known theoretical weaknesses and counterexamples. — **(Essential)**
- **Complexity Analysis**: Time/space complexity and scaling behavior. — **(Essential)**
- **Generalization & Learning Theory Links**: VC/PAC/sample-complexity notes if relevant. — **(Useful)**

### 🛠️ ALGORITHMIC IMPLEMENTATION
- **Core Algorithm(s) (Pseudocode)**: Clear, compact pseudocode with inputs/outputs and complexity notes. — **(Essential)**
- **Numerical Considerations**: Stability, conditioning, precision issues, and fixes (normalization, clipping). — **(Essential)**
- **Initialization & Regularization**: Practical strategies and their theoretical rationale. — **(Essential / If applicable)**
- **Hyperparameters & Tuning**: Key hyperparameters, default ranges, and tuning heuristics. — **(Essential)**
- **Data Representations & Preprocessing**: Feature transforms, normalization, augmentation needs. — **(Essential)**
- **Computational Optimizations**: Vectorization, batching, parallel & distributed strategies. — **(Useful)**

### ⚙️ PRACTICAL CONSIDERATIONS
- **Frameworks & Tooling**: Recommended libraries (PyTorch, TensorFlow, JAX, scikit-learn) and why. — **(Essential)**
- **Code Examples (Minimal)**: Short, copy-paste-ready snippet showing core usage. — **(Essential / Brief)**
- **Hardware & Runtime**: GPU/CPU/TPU needs, memory footprint, mixed precision advice. — **(Useful)**
- **Scalability Strategies**: Data/model parallelism, sharding, streaming data approaches. — **(Useful)**
- **Common Implementation Pitfalls**: Practical gotchas and debugging tips. — **(Essential)**

### 📊 EVALUATION & METRICS
- **Evaluation Protocol**: Train/validation/test splits, sampling strategy, reproducibility notes. — **(Essential)**
- **Primary Metrics**: Task-appropriate metrics (accuracy, F1, AUC, log-likelihood, BLEU, etc.) with interpretation. — **(Essential)**
- **Robustness & Stress Tests**: Adversarial, OOD, and robustness evaluation plans. — **(Useful)** 
- **Benchmarking & Baselines**: Standard benchmarks and strong baseline implementations. — **(Essential)**
- **Statistical Validation**: Significance testing, confidence intervals, and error bars. — **(Useful)**
- **Ablation & Sensitivity Studies**: How to measure component contributions and parameter sensitivity. — **(Useful)**

### 🔄 VARIANTS, EXTENSIONS & HYBRIDS
- **Algorithm Variants**: Brief list of important variants and their tradeoffs. — **(Essential)**
- **Hybrid Approaches**: Combinations with other models/techniques and when they help. — **(Useful)**
- **Recent Improvements**: Incremental or architectural improvements (practical notes). — **(Useful)**

### 🎯 DESIGN CHOICES & TRADE-OFFS
- **Trade-off Map**: Core trade-offs (bias vs variance, accuracy vs latency, sample-efficiency vs compute) with recommended choices. — **(Essential)**
- **When to Use / When NOT to Use**: Concrete scenarios and counterexamples. — **(Essential)**
- **Comparison Table**: Short table comparing with 2–3 competing methods on key axes. — **(Essential / Concise)**
- **Parameter Sensitivity & Robust Defaults**: Which knobs matter most and safe defaults. — **(Useful)**

### 📈 ADVANCED TOPICS & RESEARCH DIRECTIONS
- **State of the Field**: Snapshot of maturity and active research threads. — **(Useful)**
- **Open Problems**: Clear list of unsolved challenges worth investigating. — **(Useful)**
- **Cross-Disciplinary Links**: Connections to control, optimization, information theory, causal inference. — **(Useful)**

### 💡 LEARNING & MASTERY GUIDANCE
- **Learning Path**: Sequenced steps to master the concept (theory → implementation → experiments). — **(Essential)**
- **Key Papers & Texts**: Must-read papers, surveys, and books (annotated). — **(Essential)**
- **Hands-on Exercises**: Small projects, datasets, and experiments to practice core ideas. — **(Essential / Practical)**
- **Interview & Teaching Notes**: Core questions, common derivations, and concise explanations for interviews. — **(Useful)**
- **Common Misconceptions**: Short clarifications for frequent misunderstandings. — **(Essential)**

---
**Usage guidance:**  
1. Start with **Concept → Problem → What’s Unique → How it Solves** (narrative spine).  
2. Fill **Mathematical Foundations + Theoretical Guarantees** next for rigor.  
3. Add **Pseudocode, Code Snippets, and Evaluation** to make it reproducible.  
4. Use **Variants/Trade-offs** for practical decision-making, and **Learning Guidance** for study.  
Keep bullets to 1–3 lines, include key equations and one compact diagram (mechanism or model flow), and attach concrete example numbers (dataset sizes, runtimes, metric baselines) when available.

---

## FORMATTING AND STYLE REQUIREMENTS:

- **IMPORTANT**: Add one appropriate emoji at the start of EVERY main heading to make the content visually engaging
- Use proper markdown formatting with multiple heading levels (##, ###, ####)
- Include mathematical formulas using LaTeX notation in code blocks or inline math
- Include algorithmic pseudocode using markdown code blocks
- Use tables for comparisons, parameter specifications, or structured mathematical content
- Include complexity analysis and performance characteristics with Big O notation where relevant
- Use bullet points and numbered lists for clarity and organization
- Bold important mathematical concepts, algorithms, and key terms
- Create clear visual separation between major sections
- Include step-by-step derivations for complex mathematical concepts

## MATHEMATICAL RIGOR REQUIREMENTS:

- **Mathematical Precision**: Use correct mathematical notation and terminology throughout
- **Derivation Completeness**: Show key mathematical derivations step-by-step when they aid understanding
- **Formula Explanation**: Explain what each variable and parameter represents
- **Intuitive Explanations**: Provide intuitive explanations alongside mathematical formalism
- **Numerical Examples**: Include concrete numerical examples to illustrate abstract concepts
- **Graphical Intuition**: Describe visualizations that would help understand the concept
- **Complexity Analysis**: Provide time and space complexity analysis for algorithms
- **Convergence Analysis**: Discuss convergence properties and rates where applicable

## STRUCTURE FLEXIBILITY:

You have complete freedom to organize the content using headings that make the most sense for this specific AI/ML topic. The headings provided above are guidelines - adapt, modify, merge, or create new headings as needed to best explain this particular concept. Some topics might need more focus on mathematical theory, others on practical implementation, others on recent research developments, etc.

## AUDIENCE CONSIDERATION:

Write for a technical audience that includes:
- AI/ML researchers and PhD students
- Data scientists and machine learning engineers
- Software engineers working on AI/ML systems
- Graduate students studying AI/ML
- Technical professionals transitioning into AI/ML
- Anyone who needs to understand, implement, or research this AI/ML concept

The explanation should be thorough enough that someone could understand not just WHAT this concept is, but WHY it works mathematically, HOW to implement it practically, and WHEN to apply it effectively. Include both theoretical depth and practical implementation guidance.

Remember: This should read like a comprehensive AI/ML reference written by a world-class AI researcher and practitioner. Make it mathematically rigorous, conceptually clear, and practically useful while being engaging and well-structured. ALWAYS add appropriate emojis to ALL main headings for visual appeal. Include mathematical formulations, algorithmic details, and practical implementation guidance throughout.
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

    // Step 1: Get current AI/ML counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('ai_ml')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch AI/ML counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.ai_ml || 0;
    const nextTopicId = currentCount + 1;

    // Step 2: Get the next AI/ML topic
    let query = supabase
      .from('ai_ml')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next topic based on counter
      query = query.eq('id', nextTopicId);
    } else {
      query = query.eq('id', nextTopicId);
    }

    const { data: topicsData, error: topicError } = await query;

    if (topicError) {
      console.error('Error fetching AI/ML topic:', topicError);
      return NextResponse.json(
        { error: 'Database error while fetching AI/ML topic', details: topicError.message },
        { status: 500 }
      );
    }

    if (!topicsData || topicsData.length === 0) {
      console.log(`No AI/ML topic found with ID ${nextTopicId}. Current counter: ${currentCount}`);
      
      // Check if there are any topics in the table at all
      const { data: allTopics, error: countError } = await supabase
        .from('ai_ml')
        .select('id')
        .order('id', { ascending: true });
        
      if (countError) {
        return NextResponse.json(
          { error: 'Failed to check available AI/ML topics' },
          { status: 500 }
        );
      }
      
      const totalTopics = allTopics?.length || 0;
      
      return NextResponse.json(
        { 
          error: 'No more AI/ML topics available or topic not found',
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

    const topic = topicsData[0] as AiMl;

    // Step 3: Generate comprehensive AI/ML theory using Groq
    const prompt = createAiMlPrompt(topic.name);
    console.log('Generating theory for AI/ML topic:', topic.id, '-', topic.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a distinguished AI/ML researcher and professor with deep expertise in artificial intelligence, machine learning, mathematical foundations, and cutting-edge research. You create comprehensive, mathematically rigorous explanations that serve as authoritative academic and practical guides. Your explanations combine theoretical depth, mathematical rigor, algorithmic details, and practical implementation insights. You have complete autonomy to structure your response with appropriate headings that best explain the specific AI/ML concept. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging and easier to navigate. Include mathematical formulations, derivations, and algorithmic details throughout."
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
      .from('ai_ml')
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
          ai_ml: topic.id
        })
        .eq('ai_ml', currentCount);

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
      message: 'Comprehensive AI/ML theory generated and saved successfully'
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
          const result = await processAiMlTopic(id);
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
        message: `Processed ${results.filter(r => r.success).length} out of ${topicIds.length} AI/ML topics`
      });
    }

    // Handle single topic processing
    if (topicId) {
      const result = await processAiMlTopic(topicId);
      return NextResponse.json(result);
    }

    // Handle processing topics without theories
    let query = supabase
      .from('ai_ml')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: topics, error } = await query;

    if (error || !topics || topics.length === 0) {
      return NextResponse.json(
        { error: 'No AI/ML topics without theories found' },
        { status: 404 }
      );
    }

    const results = [];
    for (const topic of topics) {
      try {
        const result = await processAiMlTopic(topic.id);
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
      message: `Processed ${results.filter(r => r.success).length} AI/ML topics without theories`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual AI/ML topics
async function processAiMlTopic(topicId: number) {
  const { data: topicData, error: topicError } = await supabase
    .from('ai_ml')
    .select('*')
    .eq('id', topicId)
    .single();

  if (topicError || !topicData) {
    throw new Error(`AI/ML topic ${topicId} not found`);
  }

  const topic = topicData as AiMl;
  
  const prompt = createAiMlPrompt(topic.name);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a distinguished AI/ML researcher and professor creating comprehensive theoretical and practical reference materials. You structure content with clear, logical headings that best explain each specific AI/ML concept. Your explanations combine deep mathematical foundations with algorithmic insights and practical implementation guidance. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging. Include mathematical formulations, derivations, and algorithmic details throughout your explanations."
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
    .from('ai_ml')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', topicId);

  if (updateError) {
    throw new Error(`Failed to save theory for AI/ML topic ${topicId}`);
  }

  return {
    success: true,
    topicId,
    topicName: topic.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
    message: 'AI/ML theory generated successfully'
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
      const result = await processAiMlTopic(topicId);
      return NextResponse.json({
        ...result,
        message: 'AI/ML theory regenerated successfully'
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
        .update({ ai_ml: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'AI/ML counter reset to 0'
      });
    }
    
    if (resetTheory && topicId) {
      const { error: resetError } = await supabase
        .from('ai_ml')
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