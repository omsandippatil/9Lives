// app/api/add/interview/technical/questions/route.ts

import { createClient } from '@supabase/supabase-js';
import Groq from 'groq-sdk';
import { NextRequest, NextResponse } from 'next/server';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.TECHQ_GROQ_API_KEY!,
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
      .select('techq_topic')
      .single();

    if (questionsDoneError) {
      throw new Error(`Error fetching questions_done: ${questionsDoneError.message}`);
    }

    const currentTopicNumber = questionsDone.techq_topic;
    const nextTopicNumber = currentTopicNumber + 1;

    // Step 2: Get the topic name from techq_topics table
    const { data: topicData, error: topicError } = await supabase
      .from('techq_topics')
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

    // Step 3: Generate 50 questions using Groq Llama model
    const prompt = `Generate exactly 50 unique and non-repetitive technical interview questions for the topic: "${topicName}".

Requirements:
Start with the most basic definition-level questions and progressively increase difficulty toward advanced concepts.
Cover every important concept, subtopic, and practical use case within "${topicName}" — from fundamentals to advanced topics.
Focus ONLY on the most useful and frequently asked technical interview questions in top tech companies.
Make questions practical, realistic, and technical — directly relevant to actual interviews.
Ensure maximum coverage: theory, practical usage, performance, design, optimization, and advanced concepts.
Avoid duplicates, overlaps, or rephrasing of the same idea.
Format: each question on a new line with a number (1., 2., 3., etc.).
Do NOT include answers, explanations, or extra text — only the questions.
The final list must contain exactly 50 distinct and useful technical questions.

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

    // Step 4: Save questions to technical_questions table
    const questionsToInsert = questions.map(question => ({
      question: question
    }));

    const { data: insertedQuestions, error: insertError } = await supabase
      .from('technical_questions')
      .insert(questionsToInsert)
      .select('id');

    if (insertError) {
      throw new Error(`Error inserting questions: ${insertError.message}`);
    }

    // Step 5: Update questions_done table with the new topic number
    const { error: updateError } = await supabase
      .from('questions_done')
      .update({ techq_topic: nextTopicNumber })
      .eq('techq_topic', currentTopicNumber);

    if (updateError) {
      throw new Error(`Error updating questions_done: ${updateError.message}`);
    }

    // Return success response
    return NextResponse.json({
      success: true,
      message: `Successfully generated and saved 50 questions for topic: ${topicName}`,
      data: {
        topic_name: topicName,
        topic_number: nextTopicNumber,
        questions_generated: questions.length,
        questions_saved: insertedQuestions?.length || 0,
        sample_questions: questions.slice(0, 5) // Show first 5 as sample
      }
    });

  } catch (error: unknown) {
    console.error('Error in generate-questions API:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json({
      error: 'Internal server error',
      message: errorMessage
    }, { status: 500 });
  }
}