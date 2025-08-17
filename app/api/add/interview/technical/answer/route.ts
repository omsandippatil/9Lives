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
  apiKey: process.env.TECHQ_GROQ_API_KEY!,
});

interface TechnicalQuestion {
  id: number;
  question: string;
  difficulty_level?: string;
  category?: string;
  technology_stack?: string;
  answer?: string;
  created_at?: string;
}

interface QuestionsCounter {
  technical_questions: number;
}

// Enhanced prompt for generating comprehensive technical answers
const createTechnicalPrompt = (question: string, category?: string, difficulty?: string) => `
You are a world-class technical expert and senior software architect with 15+ years of experience. Generate an EXTREMELY COMPREHENSIVE and DETAILED answer for this technical interview question.

**Question**: "${question}"
**Category**: ${category || 'General Technical'}
**Difficulty Level**: ${difficulty || 'Intermediate to Advanced'}

## RESPONSE REQUIREMENTS:
- Minimum 4000-5000 words
- Professional, interview-ready format
- Include extensive code examples with detailed explanations
- Cover multiple programming languages where applicable
- Provide real-world implementation scenarios
- Include performance benchmarks and optimization strategies

## MANDATORY STRUCTURE:

# 🎯 Technical Interview Question

## 📋 Question
${question}

## 🎪 Executive Summary
[Provide a comprehensive 3-4 paragraph overview explaining what this question tests, why it's important in technical interviews, and the key concepts an interviewer expects you to demonstrate.]

## 🏗️ Fundamental Concepts & Architecture
[Explain the core technical concepts from ground up. Include:
- Theoretical foundation
- Historical context and evolution
- Why this technology/concept exists
- Key architectural principles
- System design considerations]

## 🔧 Technical Deep Dive
[Provide exhaustive technical details including:
- Internal workings and mechanisms
- Data structures and algorithms involved
- Memory management and resource utilization
- Concurrent processing considerations
- Network protocols and communication patterns]

## 💻 Implementation Examples
[Include comprehensive code examples in multiple languages:
- Complete, runnable code samples
- Step-by-step code walkthroughs
- Different implementation approaches
- Error handling and edge cases
- Production-ready patterns]

### Example 1: Basic Implementation
\`\`\`javascript
// Detailed implementation with extensive comments
\`\`\`

### Example 2: Advanced/Optimized Version
\`\`\`python
# Advanced implementation with performance optimizations
\`\`\`

### Example 3: Enterprise-Grade Solution
\`\`\`java
// Enterprise patterns and best practices
\`\`\`

## ⚡ Performance Analysis & Optimization
[Comprehensive performance discussion:
- Time and space complexity analysis
- Performance benchmarking data
- Bottleneck identification
- Optimization strategies and techniques
- Scalability considerations
- Load testing approaches]

## 🔒 Security Considerations
[Detailed security analysis:
- Potential vulnerabilities and attack vectors
- Security best practices and mitigation strategies
- Authentication and authorization patterns
- Data protection and encryption methods
- Compliance considerations (GDPR, HIPAA, etc.)]

## 🌍 Real-World Applications & Case Studies
[Multiple detailed real-world examples:
- How major tech companies implement this
- Specific industry use cases
- Success stories and lessons learned
- Common business problems this solves
- Integration with existing systems]

## 📊 Comparative Analysis
[Thorough comparison with alternatives:
- Detailed comparison tables
- Pros and cons analysis
- When to use each approach
- Trade-off considerations
- Migration strategies between approaches]

## 🚫 Common Pitfalls & Debugging
[Comprehensive troubleshooting guide:
- Most common mistakes and how to avoid them
- Debugging strategies and tools
- Error patterns and their solutions
- Performance anti-patterns
- Monitoring and alerting strategies]

## 🧪 Testing & Quality Assurance
[Complete testing strategy:
- Unit testing approaches and frameworks
- Integration testing patterns
- Performance testing methodologies
- Security testing considerations
- Test automation strategies
- Continuous integration best practices]

## 🎯 Interview Strategy & Communication
[Interview-specific guidance:
- How to structure your answer in an interview
- Key points to emphasize
- Follow-up questions you might receive
- How to demonstrate deep technical knowledge
- Red flags interviewers watch for]

## 🔗 Related Technologies & Ecosystem
[Comprehensive ecosystem overview:
- Related technologies and how they interact
- Industry standards and protocols
- Tool chains and development workflows
- Community resources and documentation
- Future trends and emerging technologies]

## 📈 Advanced Topics & Future Considerations
[Forward-looking analysis:
- Emerging trends and innovations
- Next-generation solutions
- Research and development directions
- Industry roadmaps and predictions
- Career growth considerations]

**Make every section extremely detailed with practical examples, code snippets, and actionable insights. Write as if creating the definitive guide that would make someone an expert on this topic.**
`;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    const category = searchParams.get('category'); // Optional filter by category
    const difficulty = searchParams.get('difficulty'); // Optional filter by difficulty
    const forceRegenerate = searchParams.get('regenerate') === 'true'; // Force regenerate existing answers
    
    // Validate API key
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Step 1: Get current questions counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('technical_question')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch question counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.technical_question || 0;
    const nextQuestionId = currentCount + 1;

    // Step 2: Build query for next technical question
    let query = supabase
      .from('technical_questions')
      .select('*');

    // Apply filters if provided
    if (category) {
      query = query.eq('category', category);
    }
    if (difficulty) {
      query = query.eq('difficulty_level', difficulty);
    }

    // Get the next question (either by ID or first unanswered)
    if (!forceRegenerate) {
      query = query.is('answer', null).limit(1);
    } else {
      query = query.eq('id', nextQuestionId);
    }

    const { data: questionsData, error: questionError } = await query;

    if (questionError || !questionsData || questionsData.length === 0) {
      console.error('Error fetching question:', questionError);
      return NextResponse.json(
        { error: 'No more questions available or question not found' },
        { status: 404 }
      );
    }

    const question = questionsData[0] as TechnicalQuestion;

    // Step 3: Generate comprehensive technical answer using Groq
    const prompt = createTechnicalPrompt(
      question.question, 
      question.category, 
      question.difficulty_level
    );

    console.log('Generating answer for question:', question.id);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a world-class technical expert and senior software architect. You provide extremely detailed, comprehensive, and interview-ready explanations that serve as definitive technical guides. Focus on practical, actionable knowledge that demonstrates deep technical expertise."
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

    let generatedAnswer = completion.choices[0]?.message?.content || '';

    // Step 4: Enhance answer if it's too short
    if (generatedAnswer.length < 6000) {
      const enhancementPrompt = `
The previous answer for the technical question "${question.question}" needs significant expansion. Please add comprehensive details in these areas:

1. **More Code Examples**: Provide detailed implementations in JavaScript, Python, Java, and Go
2. **Performance Benchmarks**: Include actual performance data and optimization strategies
3. **Enterprise Patterns**: Add enterprise-grade design patterns and architectural considerations
4. **Security Deep Dive**: Extensive security analysis with specific vulnerabilities and mitigations
5. **Real-World Case Studies**: Add 3-4 detailed case studies from major tech companies
6. **Advanced Troubleshooting**: Comprehensive debugging and monitoring strategies
7. **Testing Strategies**: Detailed testing approaches with example test cases
8. **Scalability Analysis**: How this scales in distributed systems

Previous answer:
${generatedAnswer}

Please expand this into a comprehensive technical guide with much more depth and practical examples.
`;

      const enhancementCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are expanding a technical answer to make it more comprehensive and interview-ready. Add substantial detail while maintaining professional quality."
          },
          {
            role: "user",
            content: enhancementPrompt
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 8192,
      });

      const enhancementContent = enhancementCompletion.choices[0]?.message?.content || '';
      generatedAnswer = generatedAnswer + '\n\n---\n\n# 🚀 Enhanced Technical Deep Dive\n\n' + enhancementContent;
    }

    // Step 5: Save the comprehensive answer
    const { error: updateError } = await supabase
      .from('technical_questions')
      .update({ 
        answer: generatedAnswer
      })
      .eq('id', question.id);

    if (updateError) {
      console.error('Error updating question with answer:', updateError);
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      );
    }

    // Step 6: Update counter only if processing sequentially
    if (!forceRegenerate && question.id === nextQuestionId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          technical_question: question.id
        })
        .eq('technical_questions', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      questionId: question.id,
      question: question.question,
      category: question.category,
      difficulty: question.difficulty_level,
      technology_stack: question.technology_stack,
      answer: generatedAnswer,
      previousCount: currentCount,
      newCount: question.id,
      answerLength: generatedAnswer.length,
      wordCount: generatedAnswer.split(' ').length,
      estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
      message: 'Comprehensive technical answer generated and saved successfully'
    });

  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method for targeted question processing
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
    const { questionId, questionIds, category, difficulty, batchSize = 5 } = body;
    
    // Handle batch processing
    if (questionIds && Array.isArray(questionIds)) {
      const results = [];
      
      for (const id of questionIds.slice(0, batchSize)) {
        try {
          const result = await processQuestion(id);
          results.push(result);
        } catch (error) {
          results.push({
            questionId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: results.filter(r => r.success).length,
        totalRequested: questionIds.length,
        message: `Processed ${results.filter(r => r.success).length} out of ${questionIds.length} questions`
      });
    }

    // Handle single question processing
    if (questionId) {
      const result = await processQuestion(questionId);
      return NextResponse.json(result);
    }

    // Handle category/difficulty based processing
    if (category || difficulty) {
      let query = supabase
        .from('technical_questions')
        .select('id, question, category, difficulty_level')
        .is('answer', null)
        .limit(batchSize);

      if (category) query = query.eq('category', category);
      if (difficulty) query = query.eq('difficulty_level', difficulty);

      const { data: questions, error } = await query;

      if (error || !questions || questions.length === 0) {
        return NextResponse.json(
          { error: 'No questions found matching criteria' },
          { status: 404 }
        );
      }

      const results = [];
      for (const q of questions) {
        try {
          const result = await processQuestion(q.id);
          results.push(result);
        } catch (error) {
          results.push({
            questionId: q.id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: results.filter(r => r.success).length,
        message: `Processed questions for category: ${category}, difficulty: ${difficulty}`
      });
    }

    return NextResponse.json(
      { error: 'Either questionId, questionIds array, or category/difficulty filters are required' },
      { status: 400 }
    );

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual questions
async function processQuestion(questionId: number) {
  const { data: questionData, error: questionError } = await supabase
    .from('technical_questions')
    .select('*')
    .eq('id', questionId)
    .single();

  if (questionError || !questionData) {
    throw new Error(`Question ${questionId} not found`);
  }

  const question = questionData as TechnicalQuestion;
  
  const prompt = createTechnicalPrompt(
    question.question, 
    question.category, 
    question.difficulty_level
  );

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a world-class technical expert creating comprehensive interview preparation material."
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

  let generatedAnswer = completion.choices[0]?.message?.content || '';

  // Enhance if needed
  if (generatedAnswer.length < 6000) {
    const enhancementPrompt = `Expand the technical answer for "${question.question}" with more practical examples, code implementations, and real-world applications. Make it comprehensive for interview preparation.`;

    const enhancementCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "Expand technical answers with comprehensive detail and practical examples."
        },
        {
          role: "user",
          content: enhancementPrompt + `\n\nPrevious answer:\n${generatedAnswer}`
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 8192,
    });

    const enhancement = enhancementCompletion.choices[0]?.message?.content || '';
    generatedAnswer = generatedAnswer + '\n\n---\n\n# 🎯 Additional Technical Insights\n\n' + enhancement;
  }

  // Save the answer
  const { error: updateError } = await supabase
    .from('technical_questions')
    .update({ 
      answer: generatedAnswer,
    })
    .eq('id', questionId);

  if (updateError) {
    throw new Error(`Failed to save answer for question ${questionId}`);
  }

  return {
    success: true,
    questionId,
    question: question.question,
    category: question.category,
    difficulty: question.difficulty_level,
    answerLength: generatedAnswer.length,
    wordCount: generatedAnswer.split(' ').length,
    estimatedReadTime: Math.ceil(generatedAnswer.split(' ').length / 200),
    message: 'Technical answer generated successfully'
  };
}

// PUT method for updating existing answers
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

    const { questionId, regenerateAnswer = false } = await request.json();
    
    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    if (regenerateAnswer) {
      const result = await processQuestion(questionId);
      return NextResponse.json({
        ...result,
        message: 'Technical answer regenerated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify regenerateAnswer: true to update existing answer' },
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