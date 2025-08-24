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
  apiKey: process.env.ALGO_GROQ_API_KEY!,
});

interface Algorithm {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  algorithm: number;
}

// Enhanced comprehensive prompt for generating complete algorithm theories
const createAlgorithmPrompt = (algorithmName: string) => `
You are a world-renowned computer science professor and algorithm expert creating the MOST COMPREHENSIVE yet PRACTICAL algorithm guide. This will be used by students, developers, and interview candidates who need COMPLETE understanding and implementation mastery.

**Algorithm Topic**: "${algorithmName}"

## CRITICAL REQUIREMENTS:

You MUST maintain the EXACT SAME OUTPUT FORMAT as previous responses while significantly expanding the depth and breadth of content. The structure, emojis, markdown formatting, and organization must remain identical - only the content quality and comprehensiveness should increase.

## MANDATORY COMPREHENSIVE COVERAGE:

### 🎯 ALGORITHM FUNDAMENTALS
- **Clear Definition**: Precise one-sentence definition with mathematical formulation where applicable — **(Essential)**
- **Problem Category**: Exact computational problem type this algorithm solves — **(Essential)**
- **Core Strategy**: The fundamental algorithmic approach in 2-3 sentences — **(Essential)**
- **Algorithm Classification**: Detailed categorization (sorting, searching, graph, DP, greedy, divide-and-conquer, etc.) — **(Essential)**
- **Key Algorithmic Insight**: The breakthrough insight that makes this algorithm work — **(Essential)**
- **Primary Applications**: Real-world use cases and scenarios — **(Essential)**
- **Historical Context**: Brief origin and significance in computer science — **(Essential)**

### ⚙️ DETAILED MECHANICS
- **Step-by-Step Process**: Complete algorithmic steps with decision points — **(Essential)**
- **Core Logic Flow**: Detailed control flow and branching logic — **(Essential)**
- **Comprehensive Pseudocode**: Production-ready pseudocode with all details — **(Essential)**
- **Worked Examples**: Multiple examples with different input sizes and edge cases — **(Essential)**
- **Visual Representation**: ASCII diagrams or step-by-step traces — **(Essential)**
- **Invariants**: Loop invariants and algorithmic invariants maintained — **(Essential)**

### 📊 COMPLETE COMPLEXITY ANALYSIS
- **Time Complexity**: Detailed Big O analysis with mathematical justification — **(Essential)**
- **Space Complexity**: Memory usage analysis including auxiliary space — **(Essential)**
- **Best Case Analysis**: Optimal input scenarios and their complexity — **(Essential)**
- **Average Case Analysis**: Expected performance with typical inputs — **(Essential)**
- **Worst Case Analysis**: Pathological inputs and maximum complexity — **(Essential)**
- **Amortized Analysis**: If applicable, amortized cost analysis — **(Essential)**
- **Complexity Comparison**: How it compares to alternative approaches — **(Essential)**

### ☕ COMPLETE JAVA IMPLEMENTATION & SYNTAX MASTERY
- **Production-Ready Code**: Full, optimized, error-free implementation — **(Essential)**
- **Required Imports**: Every necessary import statement and package — **(Essential)**
- **Class Architecture**: Complete class design with proper encapsulation — **(Essential)**
- **Method Signatures**: All method declarations with exact parameters and return types — **(Essential)**
- **Variable Declarations**: Every variable type, initialization, and scope — **(Essential)**
- **Array/Collection Operations**: Complete syntax for arrays, ArrayList, HashMap, etc. — **(Essential)**
- **Loop Constructs**: All loop types (for, while, enhanced-for) with exact syntax — **(Essential)**
- **Conditional Logic**: Complete if-else, switch, ternary operator usage — **(Essential)**
- **Generic Programming**: Type-safe generics implementation with wildcards — **(Essential)**
- **Exception Handling**: Comprehensive try-catch-finally with custom exceptions — **(Essential)**
- **Input Validation**: Parameter checking, null handling, boundary validation — **(Essential)**
- **Helper Methods**: All supporting method implementations — **(Essential)**
- **Recursion Implementation**: Base cases, recursive calls, stack management — **(Essential)**
- **Mathematical Operations**: All arithmetic, bitwise, and comparison operations — **(Essential)**
- **Type Conversions**: Explicit and implicit casting, wrapper classes — **(Essential)**
- **Object-Oriented Features**: Constructors, inheritance, polymorphism usage — **(Essential)**
- **Collections Framework**: Complete usage of List, Set, Map, Queue interfaces — **(Essential)**
- **String Processing**: StringBuilder, String methods, regex if needed — **(Essential)**
- **Access Control**: public, private, protected, package-private usage — **(Essential)**
- **Static vs Instance**: Method and variable classifications — **(Essential)**
- **Memory Management**: Object lifecycle, garbage collection considerations — **(Essential)**
- **Concurrency**: Thread safety considerations if applicable — **(Essential)**

### 🐍 COMPLETE PYTHON IMPLEMENTATION & SYNTAX MASTERY
- **Production-Ready Code**: Full, Pythonic, optimized implementation — **(Essential)**
- **Import Statements**: All necessary modules and from-import statements — **(Essential)**
- **Function Definitions**: Complete function syntax with type hints and docstrings — **(Essential)**
- **Variable Management**: Declaration, initialization, scope, and naming conventions — **(Essential)**
- **Data Structure Operations**: Lists, dicts, sets, tuples with all methods — **(Essential)**
- **Control Flow**: for, while, if-elif-else with Pythonic patterns — **(Essential)**
- **List/Dict Comprehensions**: Complex comprehensions with conditions and nesting — **(Essential)**
- **Exception Handling**: try-except-else-finally with specific exception types — **(Essential)**
- **Input Validation**: Parameter checking using assertions and type checking — **(Essential)**
- **Recursion Patterns**: Tail recursion, memoization, stack limit considerations — **(Essential)**
- **Mathematical Operations**: All operators, math module, operator module — **(Essential)**
- **Type Conversions**: Built-in functions, type checking, isinstance usage — **(Essential)**
- **Built-in Functions**: Comprehensive usage of len(), range(), zip(), enumerate(), etc. — **(Essential)**
- **String Manipulation**: All string methods, f-strings, formatting — **(Essential)**
- **Function Features**: Default params, *args, **kwargs, keyword-only arguments — **(Essential)**
- **Functional Programming**: lambda, map, filter, reduce, partial functions — **(Essential)**
- **Class Implementation**: Complete OOP with __init__, __str__, __repr__, properties — **(Essential)**
- **Decorators**: @property, @staticmethod, @classmethod, custom decorators — **(Essential)**
- **Context Managers**: with statements, __enter__, __exit__ methods — **(Essential)**
- **Iterator Protocol**: __iter__, __next__, generator functions and expressions — **(Essential)**
- **Memory Optimization**: __slots__, weak references, memory profiling — **(Essential)**

### 💻 EXHAUSTIVE SYNTAX REFERENCE
- **Variable Operations**: Assignment, augmented assignment, unpacking — **(Essential)**
- **Indexing/Slicing**: All access patterns, negative indexing, step values — **(Essential)**
- **Function Calls**: Parameter passing, keyword arguments, unpacking — **(Essential)**
- **Boolean Logic**: Short-circuit evaluation, truth testing, operator precedence — **(Essential)**
- **Comparison Chains**: Chained comparisons, equality vs identity — **(Essential)**
- **Arithmetic Operations**: All mathematical operators, operator overloading — **(Essential)**
- **Loop Control**: break, continue, else clauses, loop optimization — **(Essential)**
- **Null/None Handling**: Null checking patterns, optional types — **(Essential)**
- **Error Management**: Exception hierarchies, custom exceptions, logging — **(Essential)**
- **Code Documentation**: Comments, docstrings, type hints, annotations — **(Essential)**

### 🚀 ADVANCED IMPLEMENTATION STRATEGIES
- **Basic Implementation**: Clean, readable, educational version — **(Essential)**
- **Optimized Implementation**: Performance-tuned, production-ready version — **(Essential)**
- **Memory-Optimized Version**: Space-efficient implementation — **(Essential)**
- **Recursive vs Iterative**: Both approaches with trade-off analysis — **(Essential)**
- **Edge Case Handling**: Comprehensive input validation and error handling — **(Essential)**
- **Testing Framework**: Unit tests, integration tests, performance tests — **(Essential)**
- **Debugging Techniques**: Common errors, debugging strategies, profiling — **(Essential)**
- **Code Optimization**: Bottleneck identification, performance tuning — **(Essential)**

### 🏆 COMPREHENSIVE INTERVIEW PREPARATION
- **Core Concepts**: Most important theoretical points for technical interviews — **(Essential)**
- **Common Implementation Questions**: Typical coding problems and variations — **(Essential)**
- **Complexity Analysis Questions**: Time/space analysis interview questions — **(Essential)**
- **Comparison Questions**: When to use vs alternatives, trade-off discussions — **(Essential)**
- **Optimization Questions**: How to improve performance, space usage — **(Essential)**
- **Edge Case Questions**: Boundary conditions, error handling discussions — **(Essential)**
- **Real-world Application Questions**: Practical usage scenarios and examples — **(Essential)**
- **Follow-up Questions**: Advanced variations and extended problems — **(Essential)**

### ❓ TECHNICAL CODING QUESTIONS & CHALLENGES
- **Beginner Level**: Basic implementation and understanding questions — **(Essential)**
- **Intermediate Level**: Optimization and variation problems — **(Essential)**
- **Advanced Level**: Complex applications and algorithmic challenges — **(Essential)**
- **LeetCode-Style Problems**: Specific coding problems using this algorithm — **(Essential)**
- **System Design Integration**: How this algorithm fits in larger systems — **(Essential)**
- **Performance Challenges**: Speed and memory optimization problems — **(Essential)**
- **Debugging Scenarios**: Common bugs and how to fix them — **(Essential)**

### ✅ WHEN TO USE (DECISION FRAMEWORK)
- **Optimal Scenarios**: Best use cases with specific input characteristics — **(Essential)**
- **Performance Requirements**: When this algorithm meets performance needs — **(Essential)**
- **Data Characteristics**: Input size, distribution, and type considerations — **(Essential)**
- **Resource Constraints**: Memory, time, and computational limitations — **(Essential)**
- **Real-world Applications**: Specific industries and use cases — **(Essential)**
- **Scalability Requirements**: How it performs as data grows — **(Essential)**

### ❌ WHEN NOT TO USE (CRITICAL LIMITATIONS)
- **Inappropriate Scenarios**: Cases where this algorithm fails or underperforms — **(Essential)**
- **Input Size Limitations**: Scale at which algorithm becomes inefficient — **(Essential)**
- **Resource Intensiveness**: When memory or time requirements are prohibitive — **(Essential)**
- **Data Type Restrictions**: Types of data that don't work well — **(Essential)**
- **Better Alternatives**: Specific scenarios where other algorithms are superior — **(Essential)**
- **Implementation Complexity**: When simpler solutions are more appropriate — **(Essential)**

### ⚡ COMPREHENSIVE ADVANTAGES & TRADE-OFFS
- **Primary Strengths**: Key benefits with quantitative examples — **(Essential)**
- **Performance Advantages**: Speed, efficiency, scalability benefits — **(Essential)**
- **Implementation Benefits**: Code simplicity, maintainability, reliability — **(Essential)**
- **Key Limitations**: Important drawbacks with mitigation strategies — **(Essential)**
- **Resource Trade-offs**: Time vs space, simplicity vs performance — **(Essential)**
- **Comparative Analysis**: Detailed comparison with similar algorithms — **(Essential)**

### 🔧 PRACTICAL IMPLEMENTATION GUIDANCE
- **Setup Requirements**: Environment, dependencies, prerequisites — **(Essential)**
- **Step-by-Step Implementation**: Detailed coding walkthrough — **(Essential)**
- **Testing Strategy**: How to verify correctness and performance — **(Essential)**
- **Common Pitfalls**: Typical mistakes and how to avoid them — **(Essential)**
- **Optimization Techniques**: Performance improvement strategies — **(Essential)**
- **Production Considerations**: Real-world deployment factors — **(Essential)**

### 📚 ADDITIONAL LEARNING RESOURCES
- **Related Algorithms**: Connected concepts and algorithm families — **(Essential)**
- **Advanced Variations**: More sophisticated versions and extensions — **(Essential)**
- **Mathematical Foundations**: Underlying mathematical concepts — **(Essential)**
- **Research Papers**: Seminal papers and recent advances — **(Essential)**
- **Practice Problems**: Additional coding challenges and exercises — **(Essential)**

---

## STRICT FORMATTING REQUIREMENTS:

- **CRITICAL**: Add one appropriate emoji at the START of EVERY main heading (##) for visual engagement
- Use proper markdown with clear heading hierarchy (##, ###, ####)
- Include COMPLETE, runnable code examples in markdown code blocks with syntax highlighting
- Use tables for complexity analysis, method signatures, comparisons, and structured data
- Include mathematical formulas using standard notation
- Bold ALL important terms, method names, operators, and key concepts
- Use inline code formatting for variables, methods, classes, and code snippets
- Create clear visual separation between major sections
- Include ASCII diagrams or flowcharts where helpful for algorithm visualization
- Use bullet points and numbered lists for organization and clarity

## TECHNICAL PRECISION REQUIREMENTS:

- **Implementation Focus**: Include multiple complete, production-ready implementations
- **Syntax Mastery**: Show exact syntax with all language-specific features
- **Error Handling**: Comprehensive edge case coverage and exception handling
- **Performance Analysis**: Mathematical complexity analysis with proofs
- **Practical Examples**: Real-world problem solving with working code
- **Interview Readiness**: Complete preparation for technical interviews
- **Multi-language Expertise**: Deep Java and Python implementation knowledge
- **Production Quality**: Enterprise-ready code with best practices

## CONTENT DEPTH REQUIREMENTS:

**MAXIMIZE:**
- Complete working implementations with all syntax variations
- Comprehensive error handling and edge case management
- Detailed complexity analysis with mathematical justifications
- Real-world applications and practical usage scenarios
- Interview questions and coding challenges at all levels
- Performance optimization techniques and trade-off analysis
- Complete syntax mastery for both languages

**MAINTAIN EXACT FORMAT:**
- Same emoji usage pattern at start of main headings
- Identical markdown structure and organization
- Same code block formatting and syntax highlighting
- Same table structures for comparisons and analysis
- Same visual organization and section breaks

## TARGET OUTCOME:

Create the MOST COMPREHENSIVE algorithm reference that enables someone to:
1. **Master** the theoretical foundations completely
2. **Implement** flawlessly in both Java and Python with all syntax mastery
3. **Debug** and optimize implementations effectively
4. **Interview** with complete confidence at any level
5. **Choose** optimal algorithms for any given problem
6. **Teach** others with authority and depth
7. **Apply** in real-world production systems
8. **Extend** and modify for specific use cases

This should be the DEFINITIVE resource - combining the depth of a graduate textbook, the practicality of a senior developer's guide, and the completeness of a technical interview preparation manual, all while maintaining the EXACT SAME OUTPUT FORMAT as previous responses.

Remember: MAINTAIN IDENTICAL FORMATTING while dramatically expanding content quality, depth, and comprehensiveness. Every syntax element, every interview question type, every practical consideration must be covered with complete examples and detailed explanations.`;

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

    // Step 1: Get current algorithm counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('algorithm')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch algorithm counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.algorithm || 0;
    const nextAlgorithmId = currentCount + 1;

    // Step 2: Get the next algorithm
    let query = supabase
      .from('algorithms')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next algorithm based on counter
      query = query.eq('id', nextAlgorithmId);
    } else {
      query = query.eq('id', nextAlgorithmId);
    }

    const { data: algorithmsData, error: algorithmError } = await query;

    if (algorithmError) {
      console.error('Error fetching algorithm:', algorithmError);
      return NextResponse.json(
        { error: 'Database error while fetching algorithm', details: algorithmError.message },
        { status: 500 }
      );
    }

    if (!algorithmsData || algorithmsData.length === 0) {
      console.log(`No algorithm found with ID ${nextAlgorithmId}. Current counter: ${currentCount}`);
      
      // Check if there are any algorithms in the table at all
      const { data: allAlgorithms, error: countError } = await supabase
        .from('algorithms')
        .select('id')
        .order('id', { ascending: true });
        
      if (countError) {
        return NextResponse.json(
          { error: 'Failed to check available algorithms' },
          { status: 500 }
        );
      }
      
      const totalAlgorithms = allAlgorithms?.length || 0;
      
      return NextResponse.json(
        { 
          error: 'No more algorithms available or algorithm not found',
          details: {
            requestedAlgorithmId: nextAlgorithmId,
            currentCounter: currentCount,
            totalAlgorithmsInRepo: totalAlgorithms,
            availableAlgorithmIds: allAlgorithms?.map(a => a.id) || []
          }
        },
        { status: 404 }
      );
    }

    const algorithm = algorithmsData[0] as Algorithm;

    // Step 3: Generate comprehensive algorithm theory using enhanced prompt
    const prompt = createAlgorithmPrompt(algorithm.name);
    console.log('Generating enhanced comprehensive theory for algorithm:', algorithm.id, '-', algorithm.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a world-renowned computer science professor and algorithms expert with decades of teaching and research experience. You create the most comprehensive, pedagogically perfect educational materials that serve as definitive references for algorithms. Your explanations combine deep theoretical computer science knowledge with practical implementation mastery in Java and Python. You have complete autonomy to structure your response with appropriate headings that best explain each specific algorithm. CRITICAL: You MUST maintain the exact same output format, structure, and emoji usage as previous responses while dramatically expanding the depth, comprehensiveness, and quality of content. Add appropriate emojis at the start of ALL main headings to make content visually engaging and professionally organized."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.1,
      max_tokens: 8192,
    });

    const generatedTheory = completion.choices[0]?.message?.content || '';

    // Step 4: Save the comprehensive theory
    const { error: updateError } = await supabase
      .from('algorithms')
      .update({ 
        theory: generatedTheory
      })
      .eq('id', algorithm.id);

    if (updateError) {
      console.error('Error updating algorithm with theory:', updateError);
      return NextResponse.json(
        { error: 'Failed to save theory' },
        { status: 500 }
      );
    }

    // Step 5: Update counter only if processing sequentially
    if (!forceRegenerate && algorithm.id === nextAlgorithmId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          algorithm: algorithm.id
        })
        .eq('algorithm', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      algorithmId: algorithm.id,
      algorithmName: algorithm.name,
      theory: generatedTheory,
      previousCount: currentCount,
      newCount: algorithm.id,
      theoryLength: generatedTheory.length,
      wordCount: generatedTheory.split(' ').length,
      estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
      message: 'Enhanced comprehensive algorithm theory generated and saved successfully'
    });

  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method for targeted algorithm processing with enhanced prompt
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
    const { algorithmId, algorithmIds, batchSize = 3 } = body;
    
    // Handle batch processing
    if (algorithmIds && Array.isArray(algorithmIds)) {
      const results = [];
      
      for (const id of algorithmIds.slice(0, batchSize)) {
        try {
          const result = await processAlgorithm(id);
          results.push(result);
        } catch (error) {
          results.push({
            algorithmId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: results.filter(r => r.success).length,
        totalRequested: algorithmIds.length,
        message: `Processed ${results.filter(r => r.success).length} out of ${algorithmIds.length} algorithms with enhanced comprehensive theories`
      });
    }

    // Handle single algorithm processing
    if (algorithmId) {
      const result = await processAlgorithm(algorithmId);
      return NextResponse.json(result);
    }

    // Handle processing algorithms without theories
    let query = supabase
      .from('algorithms')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: algorithms, error } = await query;

    if (error || !algorithms || algorithms.length === 0) {
      return NextResponse.json(
        { error: 'No algorithms without theories found' },
        { status: 404 }
      );
    }

    const results = [];
    for (const algorithm of algorithms) {
      try {
        const result = await processAlgorithm(algorithm.id);
        results.push(result);
      } catch (error) {
        results.push({
          algorithmId: algorithm.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      batchResults: results,
      processedCount: results.filter(r => r.success).length,
      message: `Processed ${results.filter(r => r.success).length} algorithms without theories using enhanced comprehensive prompt`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Enhanced helper function to process individual algorithms
async function processAlgorithm(algorithmId: number) {
  const { data: algorithmData, error: algorithmError } = await supabase
    .from('algorithms')
    .select('*')
    .eq('id', algorithmId)
    .single();

  if (algorithmError || !algorithmData) {
    throw new Error(`Algorithm ${algorithmId} not found`);
  }

  const algorithm = algorithmData as Algorithm;
  
  const prompt = createAlgorithmPrompt(algorithm.name);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a distinguished computer science professor and world-class algorithms expert creating the most comprehensive educational materials. You structure content with clear, logical headings that best explain each specific algorithm while maintaining consistent formatting. Your explanations combine deep theoretical knowledge with practical Java and Python implementation mastery. CRITICAL: You must maintain the exact same output format, structure, and organization as previous responses while significantly expanding content depth and quality. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging and professionally organized."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.1,
    max_tokens: 8192,
  });

  const generatedTheory = completion.choices[0]?.message?.content || '';

  // Save the theory
  const { error: updateError } = await supabase
    .from('algorithms')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', algorithmId);

  if (updateError) {
    throw new Error(`Failed to save enhanced theory for algorithm ${algorithmId}`);
  }

  return {
    success: true,
    algorithmId,
    algorithmName: algorithm.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
    message: 'Enhanced comprehensive algorithm theory generated successfully'
  };
}

// PUT method for updating existing theories with enhanced content
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

    const { algorithmId, regenerateTheory = false } = await request.json();
    
    if (!algorithmId) {
      return NextResponse.json(
        { error: 'Algorithm ID is required' },
        { status: 400 }
      );
    }

    if (regenerateTheory) {
      const result = await processAlgorithm(algorithmId);
      return NextResponse.json({
        ...result,
        message: 'Algorithm theory regenerated with enhanced comprehensive content successfully'
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

// DELETE method for removing algorithms or resetting theories
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

    const { algorithmId, resetTheory = false, resetCounter = false } = await request.json();
    
    if (resetCounter) {
      const { error: resetError } = await supabase
        .from('questions_done')
        .update({ algorithm: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Algorithms counter reset to 0'
      });
    }
    
    if (resetTheory && algorithmId) {
      const { error: resetError } = await supabase
        .from('algorithms')
        .update({ theory: null })
        .eq('id', algorithmId);
      
      if (resetError) {
        throw new Error(`Failed to reset theory for algorithm ${algorithmId}`);
      }
      
      return NextResponse.json({
        success: true,
        algorithmId,
        message: 'Theory reset successfully - ready for enhanced regeneration'
      });
    }

    return NextResponse.json(
      { error: 'Specify algorithmId with resetTheory: true, or resetCounter: true' },
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