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
  apiKey: process.env.GROQ_API_KEY!,
});

interface PythonSyntax {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  python_syntax: number;
}
interface ProcessResult {
  success: boolean;
  syntaxId: number;
  syntaxName: string;
  theoryLength: number;
  wordCount: number;
  syntaxCount: number;
  tableEntries: number;
  libraryReferences: number;
  functionCount: number;
  comprehensiveScore: number;
  message: string;
}

interface ErrorResult {
  syntaxId: number;
  success: false;
  error: string;
}

type BatchResult = ProcessResult | ErrorResult;

// Ultra-comprehensive prompt for generating complete Python syntax reference
const createPythonSyntaxPrompt = (topicName: string) => `
You are the ultimate Python expert creating the most comprehensive, exhaustive syntax reference guide ever made. This will be the definitive resource for developers, students, and professionals who need complete coverage of Python syntax patterns, library operations, functions, hacks, and advanced usage techniques.

**Topic**: "${topicName}"

## CRITICAL REQUIREMENTS:

You MUST provide the most comprehensive coverage possible, including:

### 📖 Brief Introduction
- Write a focused 2-3 sentence introduction about the topic
- Explain what this syntax category encompasses
- Mention key libraries and modules related to this topic

### 📋 EXHAUSTIVE SYNTAX REFERENCE TABLE

Create the most comprehensive 2-column table covering EVERY possible Python syntax, operation, function, method, hack, and usage pattern for this topic.

**MANDATORY Table Format:**
| Syntax | Usage/Description |
|--------|-------------------|
| \`exact_syntax_here\` | Detailed description with use cases, parameters, return values, and practical examples |

**IMPORTANT FORMATTING RULES:**
- Use backticks (\`) around Python code in the syntax column, NOT $$
- Keep descriptions clean and readable without nested formatting
- Example: \`x += 5\` | Increments the value of x by 5, equivalent to x = x + 5

**ULTRA-COMPREHENSIVE COVERAGE REQUIREMENTS:**

Include ALL of the following categories with EVERY possible syntax variation:

#### 🏗️ **CREATION & DECLARATION**
- All possible ways to create/declare the data structure
- Constructor variations and parameters
- Literal syntax and alternative constructors
- Type hints and annotations
- Memory-efficient creation methods

#### 🔧 **BASIC OPERATIONS**
- All insertion methods (append, insert, extend, etc.)
- All access methods (indexing, slicing, getting)
- All modification methods (update, replace, set)
- All deletion methods (remove, pop, del, clear)
- All size/length operations

#### 📚 **BUILT-IN METHODS & FUNCTIONS**
- Every single built-in method available
- All parameters and their variations
- Method chaining examples
- Static methods and class methods
- Special methods (__init__, __str__, __repr__, etc.)

#### 🎯 **ADVANCED OPERATIONS**
- Sorting and ordering (all variations)
- Filtering and selection
- Mapping and transformation
- Aggregation and reduction
- Grouping and partitioning
- Merging and joining

#### 🔄 **ITERATION & COMPREHENSIONS**
- All iteration patterns (for, while, enumerate, zip)
- List/dict/set comprehensions
- Generator expressions
- Iterator protocol methods
- Custom iteration methods

#### 📊 **TYPE CONVERSION & CASTING**
- All conversion functions and methods
- Type checking and validation
- Serialization and deserialization
- String representations

#### 🔍 **SEARCH & QUERY OPERATIONS**
- Finding elements (index, find, search)
- Checking existence (in, count, any, all)
- Pattern matching and filtering
- Binary search and advanced lookups

#### ⚡ **PERFORMANCE & OPTIMIZATION**
- Memory-efficient operations
- Time complexity optimizations
- Lazy evaluation techniques
- Caching and memoization
- Profiling and benchmarking syntax

#### 🔗 **LIBRARY INTEGRATIONS**
Include syntax for ALL relevant Python libraries:
- **Standard Library**: collections, itertools, functools, operator, copy, etc.
- **NumPy**: array operations, mathematical functions, indexing
- **Pandas**: DataFrame/Series operations, data manipulation
- **Matplotlib/Seaborn**: plotting and visualization
- **Requests**: HTTP operations and API calls
- **JSON/XML**: parsing and serialization
- **RegEx**: pattern matching and text processing
- **DateTime**: date/time operations
- **Pathlib**: file system operations
- **Logging**: debugging and monitoring
- **Threading/AsyncIO**: concurrent operations
- **SQLAlchemy/SQLite**: database operations
- **Any other relevant libraries**

#### 🛠️ **UTILITY FUNCTIONS & HACKS**
- One-liners and shortcuts
- Performance tricks and optimizations
- Memory management techniques
- Debugging and inspection methods
- Testing and validation patterns
- Error handling and exception management

#### 🔐 **ERROR HANDLING & VALIDATION**
- Try-catch patterns for all operations
- Input validation methods
- Type checking and assertion syntax
- Custom exception handling
- Defensive programming patterns

#### 🎨 **ADVANCED PATTERNS & IDIOMS**
- Pythonic approaches and best practices
- Design patterns implementations
- Functional programming techniques
- Object-oriented patterns
- Decorator usage
- Context managers

#### 🔧 **DEBUGGING & INSPECTION**
- Debugging syntax and tools
- Introspection methods
- Property inspection
- Memory usage analysis
- Performance profiling

#### 📝 **PRACTICAL EXAMPLES & USE CASES**
- Real-world application scenarios
- Common programming patterns
- Integration with other data types
- Performance considerations
- Best practice recommendations

**FORMATTING REQUIREMENTS:**

- Use backticks (\`) around ALL Python code in the syntax column for clean rendering
- Include parameter descriptions where relevant
- Show return types and values
- Provide complexity information (O(n), O(1), etc.) where applicable
- Group related operations logically
- Use clear, descriptive explanations
- Include gotchas and common pitfalls
- Show both simple and advanced usage
- Avoid nested special characters or markers in descriptions

**QUALITY STANDARDS:**

- This must be the COMPLETE, DEFINITIVE reference
- Include edge cases and special scenarios
- Cover both common and advanced use cases  
- Provide practical, real-world examples
- Include performance implications
- Show integration with other Python features
- Cover both built-in and library functionality
- Include modern Python features (3.8+)
- Show type hints and modern syntax

**DEPTH REQUIREMENTS:**

For "${topicName}", include:
- Every single method, function, and operation
- All parameter variations and combinations
- Library-specific implementations
- Platform-specific considerations
- Version-specific features
- Integration patterns with other types
- Common algorithms and implementations
- Industry best practices
- Performance optimization techniques
- Memory management considerations

**STRUCTURE:**
Organize the table logically with sections but keep everything in ONE comprehensive table. Use clear section headers within the descriptions to group related operations.

Remember: This should be the most comprehensive Python syntax reference ever created for "${topicName}" - leave nothing out! Use clean backtick formatting for code to ensure proper rendering.`;

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

    // Step 1: Get current python_syntax counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('python_syntax')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch python_syntax counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.python_syntax || 0;
    const nextSyntaxId = currentCount + 1;

    // Step 2: Get the next python syntax topic
    let query = supabase
      .from('python_syntax')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next syntax based on counter
      query = query.eq('id', nextSyntaxId);
    } else {
      query = query.eq('id', nextSyntaxId);
    }

    const { data: syntaxData, error: syntaxError } = await query;

    if (syntaxError) {
      console.error('Error fetching python syntax:', syntaxError);
      return NextResponse.json(
        { error: 'Database error while fetching python syntax', details: syntaxError.message },
        { status: 500 }
      );
    }

    if (!syntaxData || syntaxData.length === 0) {
      console.log(`No python syntax found with ID ${nextSyntaxId}. Current counter: ${currentCount}`);
      
      // Check if there are any syntax topics in the table at all
      const { data: allSyntax, error: countError } = await supabase
        .from('python_syntax')
        .select('id')
        .order('id', { ascending: true });
        
      if (countError) {
        return NextResponse.json(
          { error: 'Failed to check available syntax topics' },
          { status: 500 }
        );
      }
      
      const totalSyntax = allSyntax?.length || 0;
      
      return NextResponse.json(
        { 
          error: 'No more syntax topics available or topic not found',
          details: {
            requestedSyntaxId: nextSyntaxId,
            currentCounter: currentCount,
            totalSyntaxInRepo: totalSyntax,
            availableSyntaxIds: allSyntax?.map(s => s.id) || []
          }
        },
        { status: 404 }
      );
    }

    const syntax = syntaxData[0] as PythonSyntax;

    // Step 3: Generate ultra-comprehensive Python syntax reference
    const prompt = createPythonSyntaxPrompt(syntax.name);
    console.log('Generating ULTRA-COMPREHENSIVE syntax reference for:', syntax.id, '-', syntax.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the ultimate Python expert and master educator with encyclopedic knowledge of Python syntax, libraries, and advanced techniques. You create the most comprehensive, exhaustive syntax references that serve as definitive guides covering every possible operation, function, method, hack, and usage pattern. Your references are legendary for their completeness and practical value. Always use backticks (`) around ALL Python code in tables for clean rendering and provide exhaustive coverage with clear organization."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.05,
      max_tokens: 8192,
    });

    const generatedTheory = completion.choices[0]?.message?.content || '';

    // Step 4: Save the ultra-comprehensive syntax reference
    const { error: updateError } = await supabase
      .from('python_syntax')
      .update({ 
        theory: generatedTheory
      })
      .eq('id', syntax.id);

    if (updateError) {
      console.error('Error updating python syntax with theory:', updateError);
      return NextResponse.json(
        { error: 'Failed to save syntax reference' },
        { status: 500 }
      );
    }

    // Step 5: Update counter only if processing sequentially
    if (!forceRegenerate && syntax.id === nextSyntaxId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          python_syntax: syntax.id
        })
        .eq('python_syntax', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      syntaxId: syntax.id,
      syntaxName: syntax.name,
      theory: generatedTheory,
      previousCount: currentCount,
      newCount: syntax.id,
      theoryLength: generatedTheory.length,
      wordCount: generatedTheory.split(' ').length,
      syntaxCount: (generatedTheory.match(/`[^`]+`/g) || []).length, // Count backtick-wrapped code
      tableEntries: (generatedTheory.match(/\|.*?\|.*?\|/g) || []).length - 1, // Subtract header row
      libraryReferences: (generatedTheory.match(/import\s+\w+|from\s+\w+/g) || []).length,
      message: 'Ultra-comprehensive Python syntax reference generated and saved successfully'
    });

  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method for targeted syntax processing
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
    const { syntaxId, syntaxIds, batchSize = 3 } = body;
    
    // Handle batch processing
    if (syntaxIds && Array.isArray(syntaxIds)) {
      const results: BatchResult[] = [];
      
      for (const id of syntaxIds.slice(0, batchSize)) {
        try {
          const result = await processPythonSyntax(id);
          results.push(result);
        } catch (error) {
          results.push({
            syntaxId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      const successfulResults = results.filter((r): r is ProcessResult => r.success);
      
      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: successfulResults.length,
        totalRequested: syntaxIds.length,
        totalSyntaxGenerated: successfulResults.reduce((acc, r) => acc + r.syntaxCount, 0),
        totalTableEntries: successfulResults.reduce((acc, r) => acc + r.tableEntries, 0),
        message: `Processed ${successfulResults.length} out of ${syntaxIds.length} syntax topics with comprehensive coverage`
      });
    }

    // Handle single syntax processing
    if (syntaxId) {
      const result = await processPythonSyntax(syntaxId);
      return NextResponse.json(result);
    }

    // Handle processing syntax topics without theories
    let query = supabase
      .from('python_syntax')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: syntaxTopics, error } = await query;

    if (error || !syntaxTopics || syntaxTopics.length === 0) {
      return NextResponse.json(
        { error: 'No syntax topics without theories found' },
        { status: 404 }
      );
    }

    const results: BatchResult[] = [];
    for (const syntaxTopic of syntaxTopics) {
      try {
        const result = await processPythonSyntax(syntaxTopic.id);
        results.push(result);
      } catch (error) {
        results.push({
          syntaxId: syntaxTopic.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successfulResults = results.filter((r): r is ProcessResult => r.success);

    return NextResponse.json({
      success: true,
      batchResults: results,
      processedCount: successfulResults.length,
      totalSyntaxGenerated: successfulResults.reduce((acc, r) => acc + r.syntaxCount, 0),
      totalTableEntries: successfulResults.reduce((acc, r) => acc + r.tableEntries, 0),
      message: `Processed ${successfulResults.length} syntax topics without theories with comprehensive coverage`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual Python syntax topics with enhanced coverage
async function processPythonSyntax(syntaxId: number): Promise<ProcessResult> {
  const { data: syntaxData, error: syntaxError } = await supabase
    .from('python_syntax')
    .select('*')
    .eq('id', syntaxId)
    .single();

  if (syntaxError || !syntaxData) {
    throw new Error(`Python syntax topic ${syntaxId} not found`);
  }

  const syntax = syntaxData as PythonSyntax;
  
  const prompt = createPythonSyntaxPrompt(syntax.name);
  console.log(`Processing ultra-comprehensive syntax for: ${syntax.name} (ID: ${syntaxId})`);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are the ultimate Python master with complete knowledge of Python syntax, standard library, popular libraries (NumPy, Pandas, Requests, etc.), advanced techniques, performance optimizations, and industry best practices. You create exhaustive syntax references that cover every possible operation, method, function, hack, and usage pattern. Your references are comprehensive enough to serve as complete language documentation for specific topics. Always use $$$$syntax$$$$ markers for Python code in tables and ensure maximum coverage and practical value."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    model: "llama-3.3-70b-versatile",
    temperature: 0.05,
    max_tokens: 8192,
  });

  const generatedTheory = completion.choices[0]?.message?.content || '';

  // Save the ultra-comprehensive theory
  const { error: updateError } = await supabase
    .from('python_syntax')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', syntaxId);

  if (updateError) {
    throw new Error(`Failed to save comprehensive syntax reference for topic ${syntaxId}`);
  }

  // Calculate comprehensive metrics
  const syntaxCount = (generatedTheory.match(/`[^`]+`/g) || []).length; // Count backtick-wrapped code
  const tableEntries = (generatedTheory.match(/\|.*?\|.*?\|/g) || []).length - 1; // Subtract header row
  const libraryReferences = (generatedTheory.match(/import\s+\w+|from\s+\w+|\w+\./g) || []).length;
  const functionCount = (generatedTheory.match(/\w+\(/g) || []).length;

  return {
    success: true,
    syntaxId,
    syntaxName: syntax.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    syntaxCount,
    tableEntries,
    libraryReferences,
    functionCount,
    comprehensiveScore: Math.round((syntaxCount + tableEntries + libraryReferences) / 10), // Custom metric
    message: 'Ultra-comprehensive Python syntax reference generated successfully'
  };
}

// PUT method for updating existing syntax references with enhanced coverage
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

    const { syntaxId, regenerateTheory = false } = await request.json();
    
    if (!syntaxId) {
      return NextResponse.json(
        { error: 'Syntax ID is required' },
        { status: 400 }
      );
    }

    if (regenerateTheory) {
      const result = await processPythonSyntax(syntaxId);
      return NextResponse.json({
        ...result,
        message: 'Ultra-comprehensive Python syntax reference regenerated successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify regenerateTheory: true to update existing theory with comprehensive coverage' },
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

// DELETE method for removing syntax topics or resetting theories
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

    const { syntaxId, resetTheory = false, resetCounter = false } = await request.json();
    
    if (resetCounter) {
      const { error: resetError } = await supabase
        .from('questions_done')
        .update({ python_syntax: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Python syntax counter reset to 0 - ready for comprehensive generation'
      });
    }
    
    if (resetTheory && syntaxId) {
      const { error: resetError } = await supabase
        .from('python_syntax')
        .update({ theory: null })
        .eq('id', syntaxId);
      
      if (resetError) {
        throw new Error(`Failed to reset theory for syntax topic ${syntaxId}`);
      }
      
      return NextResponse.json({
        success: true,
        syntaxId,
        message: 'Theory reset successfully - ready for ultra-comprehensive regeneration'
      });
    }

    return NextResponse.json(
      { error: 'Specify syntaxId with resetTheory: true, or resetCounter: true' },
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