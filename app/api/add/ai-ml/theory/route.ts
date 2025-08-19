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

// Enhanced prompt optimized for the frontend's emoji-section parsing system
const createAiMlPrompt = (topicName: string) => `
You are a distinguished AI/ML researcher, professor, and practitioner with deep expertise in artificial intelligence, machine learning, deep learning, mathematical foundations, and cutting-edge research. You will generate a COMPREHENSIVE, MATHEMATICALLY RIGOROUS, and CONCEPTUALLY DETAILED explanation about the AI/ML topic provided.

**AI/ML Topic**: "${topicName}"

## CRITICAL FORMATTING REQUIREMENTS FOR FRONTEND COMPATIBILITY:

### 🎯 **Section Structure Format**
Each main section MUST follow this EXACT format:

🔬 **Section Title Here**

Section content goes here with detailed explanations, mathematical formulas, code examples, etc.

Mathematical formulas should use LaTeX notation: $E = mc^2$, $O(n)$, $\Omega(n \log n)$, $\Theta(n^2)$

### 📋 **Required Emoji Section Headers**
You MUST include sections with these specific emoji patterns (choose appropriate emojis from this list):
- 🧠 🤖 💡 📊 🔬 🎯 📚 🔧 🌟 💻 🚀 🎨 🔍 📈 🧩 ⚡ 🎓 📋 🔮 🌍 🧪 📐 🔢 💾 🎪 🏠 🔒 🚫 🌈 🎭 🔥 💎 🎉 🧮 ⚛️ 🔑 🔄 ⭐ 📝 📌 🛠️ ⚠️ 🎤 🔗 ❌

### 💡 **Mathematical Notation Guidelines**
- Use LaTeX notation: $O(n)$, $\Omega(n)$, $\Theta(n)$ for complexity
- Inline math: $E = mc^2$, $P(X|Y) = \frac{P(Y|X)P(X)}{P(Y)}$
- Display math for complex equations: $$\nabla_\theta J(\theta) = \frac{1}{m}\sum_{i=1}^{m}\nabla_\theta L(f_\theta(x^{(i)}), y^{(i)})$$
- Use proper mathematical symbols: $\alpha$, $\beta$, $\gamma$, $\sigma$, $\mu$, $\lambda$

## MANDATORY CONTENT AREAS TO COVER:
# AI / ML CONCEPT — Study & Validation Template
(Goal: learn the concept deeply **and** prove it works — intuition, math, code, experiments, and production-readiness.)

## 🧠 CONCEPT & CONTEXT
- **One-line Concept Statement** — **(Essential)**: single clear sentence describing the idea and its goal.
- **Precise Definition & Notation** — **(Essential)**: formal math notation and a glossary of symbols.
- **Problem Domain & Use Cases** — **(Essential)**: tasks it targets (classification, RL, density estimation) and concrete product examples.
- **What Problem Is Solved (Measurable)** — **(Essential)**: map concept → specific, measurable outcomes (e.g., accuracy ↑ from A→B, sample-efficiency ↑, latency ↓).
- **How It Solves the Problem (Intuition + Mechanism)** — **(Essential)**: short intuitive paragraph + core mechanism summary (cause → effect).
- **Uniqueness / Differentiators** — **(Useful)**: key assumptions, guarantees, or capabilities that set it apart.
- **When to Use / When NOT to Use** — **(Essential)**: practical applicability and clear anti-patterns.
- **Prerequisites & Assumptions** — **(Essential)**: required math/ML knowledge and explicit problem assumptions.

## 🔬 MATHEMATICAL & THEORETICAL CORE
- **Required Math Background** — **(Essential)**: linear algebra, probability, optimization pieces you must know first.
- **Core Objective(s) & Formulations** — **(Essential)**: loss functions, probabilistic models, and main equations.
- **Derivations & Key Steps** — **(Essential)**: step-by-step derivations for main results; include simplified proofs or references.
- **Optimization Landscape & Guarantees** — **(Essential)**: convexity/non-convexity, convergence rates, sample complexity where known.
- **Theoretical Limits & Failure Modes** — **(Essential)**: cases where theory fails or bounds are loose.

## 💻 ALGORITHMIC SPECIFICATION
- **Algorithm (Compact Pseudocode)** — **(Essential)**: inputs, outputs, complexity annotations.
- **Key Hyperparameters & Defaults** — **(Essential)**: which knobs matter and sensible starting values.
- **Numerical Stability & Practical Fixes** — **(Essential)**: normalization, clipping, regularizers, precision choices.
- **Data Representation & Preprocessing** — **(Essential)**: required transforms, augmentation, feature engineering tips.
- **Complexity Analysis (Time/Space)** — **(Essential)**: Big-O and bottleneck identification.

## 🛠️ PRACTICAL IMPLEMENTATION & DEMO
- **Recommended Frameworks** — **(Essential)**: e.g., PyTorch/JAX for research; TF/TF-Serving for production; scikit-learn for simple baselines.
- **Minimal Working Example (Code Snippet)** — **(Essential)**: a runnable minimal example that trains and evaluates on a tiny dataset.
- **Reproducibility Controls** — **(Essential)**: seed management, environment, deterministic ops, random-split protocol.
- **Toy Experiments to Build Intuition** — **(Essential)**: 2–3 tiny experiments (toy dataset + expected behavior + visualization).
- **Scaling Recipe** — **(Useful)**: steps to move from toy → benchmark → production (data, compute, distributed training).
- **Common Implementation Pitfalls** — **(Essential)**: typical bugs and how to detect them.

## 📊 EXPERIMENTAL PROTOCOL — *How to show it works*
- **Datasets & Benchmarks** — **(Essential)**: recommended datasets (toy, benchmark, and realistic) and baseline comparisons.
- **Train/Val/Test Splits & Protocol** — **(Essential)**: exact split strategy, cross-val or holdout, repeated runs.
- **Primary Metrics & Secondary Metrics** — **(Essential)**: e.g., accuracy / F1 / p95 latency / memory; choose metrics that map to the problem statement.
- **Ablation & Sensitivity Studies** — **(Essential)**: ablate components, vary hyperparams, show which parts matter.
- **Statistical Rigor** — **(Essential)**: report mean ± std over N runs, significance testing, confidence intervals.
- **Visualization Checklist** — **(Essential)**: loss curves, metric vs epoch, confusion matrix/ROC, calibration plots, example successes & failures.
- **Failure Analysis** — **(Essential)**: systematic analysis of error cases and root-cause hypotheses.

## 🔍 COMPARISON & BASELINES
- **Strong Baselines to Beat** — **(Essential)**: 2–3 well-tuned baselines (include simple heuristics).
- **Comparison Table** — **(Essential)**: accuracy, latency, memory, data-efficiency, assumptions.
- **Trade-off Analysis** — **(Essential)**: compute vs performance, sample-efficiency vs generalization, simplicity vs robustness.

## 🚀 DEPLOYMENT & PRODUCTION CHECKS
- **Latency / Throughput Benchmarks** — **(Essential if production)**: per-inference latency, batch throughput, p99/p95.
- **Resource & Cost Estimates** — **(Useful)**: GPU hours, memory footprint, recurring infra costs.
- **Robustness & OOD Checks** — **(Essential)**: adversarial or distribution-shift tests, fallback behavior.
- **Monitoring Signals** — **(Essential)**: metrics to watch in prod (drift, input distribution, performance).
- **Explainability & Debugging Tools** — **(Useful)**: saliency maps, SHAP/LIME, counterfactuals where relevant.


## CONTENT DEPTH AND STYLE REQUIREMENTS:

1. **Academic Rigor**: Include mathematical proofs, derivations, and formal statements
2. **Practical Insight**: Provide implementation details, code snippets, and real-world considerations  
3. **Clear Explanations**: Balance technical depth with intuitive explanations
4. **Comprehensive Coverage**: Address theoretical foundations, algorithms, and applications
5. **Current Relevance**: Include recent developments and state-of-the-art techniques

## MATHEMATICAL RIGOR REQUIREMENTS:

- **Precision**: Use correct mathematical notation and terminology
- **Derivations**: Show key mathematical steps and reasoning
- **Examples**: Include concrete numerical examples where helpful
- **Complexity**: Analyze time/space complexity and convergence rates
- **Bounds**: Discuss theoretical guarantees and limitations

## CODE AND ALGORITHM REQUIREMENTS:

- Include pseudocode for core algorithms
- Show practical implementation snippets
- Explain algorithmic choices and optimizations
- Discuss numerical considerations and stability
- Provide complexity analysis

## AUDIENCE AND TONE:

Write for ML practitioners, researchers, and advanced students who need:
- Deep theoretical understanding
- Practical implementation guidance  
- Mathematical rigor and formal treatment
- Current research context and developments
- Clear explanations of complex concepts

The content should be comprehensive enough to serve as both a learning resource and implementation reference, combining academic depth with practical utility.

## FINAL FORMATTING CHECKLIST:

Each section starts with an emoji followed by **Bold Title**
Mathematical formulas use proper LaTeX notation ($...$)  
Code blocks are properly formatted with language specification
Complex equations are displayed on separate lines ($$...$$)
Big O notation uses proper mathematical formatting: $O(n)$, $\Omega(n)$, $\Theta(n)$
Content is structured with clear headings and subheadings
Both theoretical depth and practical implementation details are included
The explanation progresses logically from concepts to implementation to applications

Remember: The frontend parsing system will automatically detect emoji-prefixed sections and create expandable cards. Each section should be substantial and self-contained while contributing to the overall comprehensive understanding of the topic.
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

    // Step 3: Generate frontend-optimized AI/ML theory using Groq
    const prompt = createAiMlPrompt(topic.name);
    console.log('Generating frontend-optimized theory for AI/ML topic:', topic.id, '-', topic.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a distinguished AI/ML researcher and professor creating comprehensive educational content. You must format ALL content to be compatible with a frontend parsing system that detects emoji-prefixed sections. CRITICAL: Every main section must start with an emoji followed by **bold text** for the title. Use proper LaTeX notation for math ($...$), format code blocks correctly, and create content that will be parsed into expandable cards. Your explanations must combine deep theoretical knowledge with practical implementation guidance, structured in a way that enhances learning through interactive exploration."
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

    // Step 4: Save the frontend-optimized theory
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

    // Step 6: Analyze generated content for frontend compatibility
    const emojiSectionCount = (generatedTheory.match(/^[🧠🤖💡📊🔬🎯📚🔧🌟💻🚀🎨🔍📈🧩⚡🎓📋🔮🌍🧪📐🔢💾🎪🏠🔒🚫🌈🎭🔥💎🎉🎪🧮⚛️🎯🔑🎪🔄⭐📝📌🛠️⚠️🎤🔗✅❌]+\s*\*\*[^*]+\*\*/gm) || []).length;
    const mathFormulaCount = (generatedTheory.match(/\$[^$]+\$/g) || []).length;
    const codeBlockCount = (generatedTheory.match(/```[\s\S]*?```/g) || []).length;

    return NextResponse.json({
      success: true,
      topicId: topic.id,
      topicName: topic.name,
      theory: generatedTheory,
      previousCount: currentCount,
      newCount: topic.id,
      contentAnalysis: {
        theoryLength: generatedTheory.length,
        wordCount: generatedTheory.split(' ').length,
        estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
        emojiSections: emojiSectionCount,
        mathFormulas: mathFormulaCount,
        codeBlocks: codeBlockCount,
        frontendCompatible: emojiSectionCount > 0
      },
      message: 'Frontend-optimized AI/ML theory generated and saved successfully'
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

// Helper function to process individual AI/ML topics with frontend optimization
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
        content: "You are a distinguished AI/ML researcher creating educational content optimized for interactive learning. Format ALL content for frontend parsing: every main section must start with emoji + **bold title**, use LaTeX math notation ($...$), and create comprehensive content that will become expandable learning cards. Combine theoretical rigor with practical implementation guidance."
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

  // Analyze content for frontend compatibility
  const emojiSectionCount = (generatedTheory.match(/^[🧠🤖💡📊🔬🎯📚🔧🌟💻🚀🎨🔍📈🧩⚡🎓📋🔮🌍🧪📐🔢💾🎪🏠🔒🚫🌈🎭🔥💎🎉🎪🧮⚛️🎯🔑🎪🔄⭐📝📌🛠️⚠️🎤🔗✅❌]+\s*\*\*[^*]+\*\*/gm) || []).length;
  const mathFormulaCount = (generatedTheory.match(/\$[^$]+\$/g) || []).length;
  const codeBlockCount = (generatedTheory.match(/```[\s\S]*?```/g) || []).length;

  return {
    success: true,
    topicId,
    topicName: topic.name,
    contentAnalysis: {
      theoryLength: generatedTheory.length,
      wordCount: generatedTheory.split(' ').length,
      estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
      emojiSections: emojiSectionCount,
      mathFormulas: mathFormulaCount,
      codeBlocks: codeBlockCount,
      frontendCompatible: emojiSectionCount > 0
    },
    message: 'Frontend-optimized AI/ML theory generated successfully'
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
        message: 'Frontend-optimized AI/ML theory regenerated successfully'
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