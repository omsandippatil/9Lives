// app/api/add/interview/fundamental/questions/route.ts

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.FUNDAQ_GROQ_API_KEY!,
});

// App Router GET function
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const api_key = searchParams.get('api_key');

    // Verify API key
    if (!api_key || api_key !== process.env.API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Step 1: Get the current topic number from questions_done table
    const { data: questionsDone, error: questionsDoneError } = await supabase
      .from('questions_done')
      .select('fundaq_topic')
      .single();

    if (questionsDoneError) {
      throw new Error(`Error fetching questions_done: ${questionsDoneError.message}`);
    }

    const currentTopicNumber = questionsDone.fundaq_topic;
    const nextTopicNumber = currentTopicNumber + 1;

    // Step 2: Get the topic name from fundaq_topics table
    const { data: topicData, error: topicError } = await supabase
      .from('fundaq_topics')
      .select('topic_name')
      .eq('id', nextTopicNumber)
      .single();

    if (topicError) {
      throw new Error(`Error fetching topic: ${topicError.message}`);
    }

    if (!topicData) {
      return NextResponse.json({ error: 'Topic not found' }, { status: 404 });
    }

    const topicName = topicData.topic_name;

    // Step 3: Generate 50 fundamental questions using Groq Llama model
    const prompt = `Generate exactly 50 unique and non-repetitive fundamental interview questions for the topic: "${topicName}".

Requirements:
Focus on fundamental, foundational concepts that every developer should know about "${topicName}".
Start with the most basic definition-level questions and progressively increase to intermediate fundamentals.
Cover core principles, basic theory, essential concepts, and foundational understanding of "${topicName}".
These should be questions that test fundamental knowledge rather than advanced or specialized topics.
Make questions clear, straightforward, and focused on core understanding.
Include basic practical applications and real-world usage of fundamental concepts.
Ensure maximum coverage of all fundamental aspects within "${topicName}".
Avoid duplicates, overlaps, or rephrasing of the same fundamental concept.
Format: each question on a new line with a number (1., 2., 3., etc.).
Do NOT include answers, explanations, or extra text — only the questions.
The final list must contain exactly 50 distinct fundamental questions.

Topic: ${topicName}`;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.5,
      max_tokens: 4000,
    });

    const generatedContent = chatCompletion.choices[0]?.message?.content;
    
    if (!generatedContent) {
      throw new Error('Failed to generate questions from Groq');
    }

    // Parse the generated questions
    const questionLines = generatedContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // Remove numbering (1., 2., etc.) from the beginning of each line
        return line.replace(/^\d+\.\s*/, '').trim();
      })
      .filter(question => question.length > 10); // Filter out very short lines

    // Ensure we have exactly 50 questions
    if (questionLines.length < 50) {
      throw new Error(`Generated only ${questionLines.length} questions, need exactly 50`);
    }

    // Take exactly 50 questions
    const questions = questionLines.slice(0, 50);

    // Final validation: Ensure we have exactly 50 questions before database insertion
    if (questions.length !== 50) {
      throw new Error(`Expected exactly 50 questions but got ${questions.length}. Aborting database insertion.`);
    }

    // Step 4: Save questions to fundamental_questions table only if we have exactly 50
    const questionsToInsert = questions.map(question => ({
      question: question
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('fundamental_questions')
      .insert(questionsToInsert)
      .select();

    if (insertError) {
      throw new Error(`Error inserting questions: ${insertError.message}`);
    }

    // Step 5: Update questions_done table with the new topic number
    const { error: updateError } = await supabase
      .from('questions_done')
      .update({ fundaq_topic: nextTopicNumber })
      .eq('fundaq_topic', currentTopicNumber);

    if (updateError) {
      throw new Error(`Error updating questions_done: ${updateError.message}`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully generated and saved 50 fundamental questions for topic: ${topicName}`,
      data: {
        topic_name: topicName,
        topic_number: nextTopicNumber,
        questions_generated: questions.length,
        questions_saved: insertedQuestions?.length || 0,
        sample_questions: questions.slice(0, 5) // Show first 5 as sample
      }
    });

  } catch (error: unknown) {
    console.error('Error in generate-fundamental-questions API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      error: 'Internal server error',
      message: errorMessage
    }, { status: 500 });
  }
}