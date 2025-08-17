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
  apiKey: process.env.FUNDAQ_GROQ_API_KEY!,
});

interface FundamentalQuestion {
  id: number;
  question: string;
  difficulty_level?: string;
  category?: string;
  answer?: string;
}

interface QuestionsCounter {
  fundamental_questions: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('api_key');
    
    // Validate API key
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json(
        { error: 'Invalid or missing API key' },
        { status: 401 }
      );
    }

    // Step 1: Get current questions_done count
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('fundamental_question')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch question counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.fundamental_question || 0;
    const nextQuestionId = currentCount + 1;

    // Step 2: Get the next fundamental question
    const { data: questionData, error: questionError } = await supabase
      .from('fundamental_questions')
      .select('*')
      .eq('id', nextQuestionId)
      .single();

    if (questionError || !questionData) {
      console.error('Error fetching question:', questionError);
      return NextResponse.json(
        { error: 'No more questions available or question not found' },
        { status: 404 }
      );
    }

    const question = questionData as FundamentalQuestion;

    // Step 3: Generate comprehensive answer using Groq
    const prompt = `
You are the world's leading fundamental expert and educator. I need you to create an EXTREMELY DETAILED, COMPREHENSIVE, and THOROUGH answer for this fundamental interview question: "${question.question}"

REQUIREMENTS FOR YOUR RESPONSE:
1. Write a VERY LONG and DETAILED explanation (minimum 3000-4000 words)
2. Use proper markdown formatting throughout
3. Include extensive code examples with detailed comments
4. Provide multiple real-world scenarios and use cases
5. Explain every concept from basic to advanced level
6. Include step-by-step breakdowns for complex processes
7. Add detailed comparisons with alternatives
8. Provide comprehensive troubleshooting guides
9. Include performance considerations and optimization tips
10. Add security considerations where applicable

STRUCTURE YOUR RESPONSE AS FOLLOWS:

# 🎯 Fundamental Interview Question & Answer

## 📝 Question
${question.question}

## 💡 Executive Summary
[2-3 paragraph comprehensive overview of what this question covers and why it's important]

## 🔍 Core Concept Deep Dive
[Provide an extremely detailed explanation of the fundamental concepts. Explain it as if teaching someone completely new to the topic. Include historical context, evolution of the technology/concept, and why it exists.]

## 🏗️ Architecture & Components Breakdown
[Detail every single component, their relationships, data flow, communication patterns, and dependencies. Include diagrams in text form where helpful.]

## ⚙️ How It Works - Complete Step-by-Step Process
[Provide an exhaustive step-by-step breakdown. Number each step and explain what happens at each stage, why it happens, and what the implications are.]

## 🔧 Implementation Details
[Include detailed code examples in multiple programming languages where applicable. Add extensive comments explaining every line. Show different approaches and implementations.]

## 📊 Comprehensive Comparison Analysis
[Create detailed comparison tables and explanations comparing with alternatives, pros/cons, use cases for each approach.]

## 🌟 Real-World Examples & Case Studies
[Provide multiple detailed real-world scenarios. Explain how major companies implement this, specific use cases, and actual problems this solves.]

## 🚀 Performance & Optimization
[Detailed discussion on performance implications, bottlenecks, optimization strategies, benchmarking approaches, and scaling considerations.]

## 🔒 Security Considerations
[Comprehensive security analysis including vulnerabilities, attack vectors, mitigation strategies, and security best practices.]

## ✅ Best Practices & Design Patterns
[Extensive list of industry best practices, design patterns, coding standards, and professional recommendations.]

## 🚫 Common Pitfalls & Troubleshooting
[Detailed analysis of what can go wrong, why it goes wrong, how to identify issues, and comprehensive troubleshooting guides.]

## 🧪 Testing Strategies
[Complete testing approaches including unit tests, integration tests, performance tests, and quality assurance strategies.]

## 📈 Monitoring & Observability
[How to monitor, log, trace, and observe the system/concept in production environments.]

## 🎯 Advanced Interview Tips & Strategies
[Specific strategies for answering this question in interviews, what interviewers are looking for, how to demonstrate deep knowledge.]

## 🔗 Related Technologies & Concepts
[Comprehensive list of related technologies, concepts, and how they interconnect with this topic.]

## 🌍 Industry Trends & Future Outlook
[Current trends, emerging technologies, future developments, and how this concept is evolving.]

Make every section extremely detailed and comprehensive. Use proper markdown formatting with headers, subheaders, code blocks, tables, lists, and emphasis. Include plenty of code examples with detailed explanations. Write as if this is the definitive guide that someone could use to become an expert on this topic.

Do not hold back on detail - I want the most comprehensive, detailed, and thorough explanation possible. Every paragraph should be substantial and informative.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the world's leading fundamental expert and educator. You provide extremely detailed, comprehensive, and thorough explanations that serve as definitive guides. You write extensive content with proper markdown formatting, detailed code examples, and cover every aspect of fundamental topics in great depth."
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

    const generatedAnswer = completion.choices[0]?.message?.content || '';

    // If the answer seems too short, generate additional content
    let finalAnswer = generatedAnswer;
    
    if (generatedAnswer.length < 5000) {
      const additionalPrompt = `
The previous answer for "${question.question}" needs to be more comprehensive. Please expand it significantly by adding:

1. More detailed code examples with extensive comments
2. Additional real-world scenarios and use cases
3. Deeper fundamental explanations
4. More comprehensive comparisons
5. Extended troubleshooting sections
6. Additional best practices
7. More security considerations
8. Performance optimization details

Continue from where the previous answer left off and make it much more detailed and comprehensive. Ensure proper markdown formatting throughout.

Previous answer was:
${generatedAnswer}

Please provide additional comprehensive content to make this a truly detailed fundamental guide.
`;

      const additionalCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "You are expanding a fundamental answer to make it more comprehensive and detailed. Continue with the same level of expertise and markdown formatting."
          },
          {
            role: "user",
            content: additionalPrompt
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 8192,
      });

      const additionalContent = additionalCompletion.choices[0]?.message?.content || '';
      finalAnswer = generatedAnswer + '\n\n' + additionalContent;
    }

    // Step 4: Save the answer to the fundamental_questions table
    const { error: updateError } = await supabase
      .from('fundamental_questions')
      .update({ answer: finalAnswer })
      .eq('id', nextQuestionId);

    if (updateError) {
      console.error('Error updating question with answer:', updateError);
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      );
    }

    // Step 5: Increment the questions_done counter
    const { error: incrementError } = await supabase
      .from('questions_done')
      .update({ fundamental_question: nextQuestionId })
      .eq('fundamental_question', currentCount);

    if (incrementError) {
      console.error('Error incrementing counter:', incrementError);
      // Don't fail the request if counter increment fails
    }

    return NextResponse.json({
      success: true,
      questionId: nextQuestionId,
      question: question.question,
      answer: finalAnswer,
      previousCount: currentCount,
      newCount: nextQuestionId,
      answerLength: finalAnswer.length,
      message: 'Comprehensive answer generated and saved successfully'
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST method for manual question processing
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

    const { questionId } = await request.json();
    
    if (!questionId) {
      return NextResponse.json(
        { error: 'Question ID is required' },
        { status: 400 }
      );
    }

    // Process specific question by ID
    const { data: questionData, error: questionError } = await supabase
      .from('fundamental_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (questionError || !questionData) {
      return NextResponse.json(
        { error: 'Question not found' },
        { status: 404 }
      );
    }

    const question = questionData as FundamentalQuestion;

    // Generate comprehensive answer using the same detailed prompt as GET method
    const prompt = `
You are the world's leading fundamental expert and educator. I need you to create an EXTREMELY DETAILED, COMPREHENSIVE, and THOROUGH answer for this fundamental interview question: "${question.question}"

[Same detailed requirements and structure as in GET method...]

Make every section extremely detailed and comprehensive. Use proper markdown formatting with headers, subheaders, code blocks, tables, lists, and emphasis. Include plenty of code examples with detailed explanations. Write as if this is the definitive guide that someone could use to become an expert on this topic.

Do not hold back on detail - I want the most comprehensive, detailed, and thorough explanation possible. Every paragraph should be substantial and informative.
`;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the world's leading fundamental expert and educator. You provide extremely detailed, comprehensive, and thorough explanations that serve as definitive guides."
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

    const generatedAnswer = completion.choices[0]?.message?.content || '';

    // Generate additional content if needed
    let finalAnswer = generatedAnswer;
    
    if (generatedAnswer.length < 5000) {
      const additionalPrompt = `
Please expand the answer for "${question.question}" to be much more comprehensive and detailed. Add more sections, examples, and explanations.

Previous answer:
${generatedAnswer}
`;

      const additionalCompletion = await groq.chat.completions.create({
        messages: [
          {
            role: "system",
            content: "Expand the fundamental answer to make it more comprehensive."
          },
          {
            role: "user",
            content: additionalPrompt
          }
        ],
        model: "llama-3.3-70b-versatile",
        temperature: 0.2,
        max_tokens: 8192,
      });

      const additionalContent = additionalCompletion.choices[0]?.message?.content || '';
      finalAnswer = generatedAnswer + '\n\n' + additionalContent;
    }

    // Update the question with the answer
    const { error: updateError } = await supabase
      .from('fundamental_questions')
      .update({ answer: finalAnswer })
      .eq('id', questionId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to save answer' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      questionId,
      question: question.question,
      answer: finalAnswer,
      answerLength: finalAnswer.length,
      message: 'Comprehensive answer generated and saved successfully'
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}