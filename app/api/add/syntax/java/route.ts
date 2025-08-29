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

interface JavaSyntax {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  java_syntax: number;
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
  methodCount: number;
  classCount: number;
  comprehensiveScore: number;
  message: string;
}

interface ErrorResult {
  syntaxId: number;
  success: false;
  error: string;
}

type BatchResult = ProcessResult | ErrorResult;

// Ultra-comprehensive prompt for generating complete Java syntax reference
const createJavaSyntaxPrompt = (topicName: string) => `
You are the ultimate Java expert creating the most comprehensive, exhaustive syntax reference guide ever made. This will be the definitive resource for developers, students, and professionals who need complete coverage of Java syntax patterns, framework operations, methods, best practices, and advanced usage techniques.

**Topic**: "${topicName}"

## CRITICAL REQUIREMENTS:

You MUST provide the most comprehensive coverage possible, including:

### 📖 Brief Introduction
- Write a focused 2-3 sentence introduction about the topic
- Explain what this syntax category encompasses in Java
- Mention key packages, frameworks, and APIs related to this topic

### 📋 EXHAUSTIVE SYNTAX REFERENCE TABLE

Create the most comprehensive 2-column table covering EVERY possible Java syntax, operation, method, class, interface, annotation, design pattern, and usage technique for this topic.

**MANDATORY Table Format:**
| Syntax | Usage/Description |
|--------|-------------------|
| \`exact_syntax_here\` | Detailed description with use cases, parameters, return values, exceptions, and practical examples |

**IMPORTANT FORMATTING RULES:**
- Use backticks (\`) around Java code in the syntax column, NOT $$
- Keep descriptions clean and readable without nested formatting
- Example: \`int x += 5;\` | Increments the value of x by 5, equivalent to x = x + 5

**ULTRA-COMPREHENSIVE COVERAGE REQUIREMENTS:**

Include ALL of the following categories with EVERY possible syntax variation:

#### 🏗️ **CREATION & DECLARATION**
- All possible ways to declare/initialize data structures and objects
- Constructor variations and parameters
- Factory method patterns and builder patterns
- Generic type declarations and wildcards
- Annotation usage and custom annotations
- Memory-efficient creation methods

#### 🔧 **BASIC OPERATIONS**
- All CRUD operations (Create, Read, Update, Delete)
- All access methods (getters, setters, indexing)
- All modification methods (add, remove, update, replace)
- All query methods (contains, size, isEmpty)
- Method chaining and fluent interfaces

#### 📚 **BUILT-IN METHODS & CLASSES**
- Every single method from relevant Java standard library classes
- All parameters, overloads, and variations
- Exception handling for each method
- Static methods and instance methods
- Utility classes and helper methods

#### 🎯 **ADVANCED OPERATIONS**
- Sorting and comparison (Comparable, Comparator)
- Filtering and mapping with Streams API
- Parallel processing and concurrent operations
- Reflection and introspection
- Serialization and deserialization
- Cloning and copying strategies

#### 🔄 **ITERATION & STREAMS**
- All iteration patterns (for, while, enhanced for-each)
- Stream API operations (filter, map, reduce, collect)
- Parallel streams and performance considerations
- Custom iterators and spliterators
- Optional handling and null safety

#### 📊 **TYPE CONVERSION & CASTING**
- Primitive and wrapper type conversions
- Object casting and instanceof checks
- Generic type erasure handling
- Autoboxing and unboxing
- String representations and parsing

#### 🔍 **SEARCH & QUERY OPERATIONS**
- Binary search and linear search implementations
- Pattern matching with regular expressions
- Collections framework search methods
- Custom search algorithms and optimizations
- Database query patterns (JDBC, JPA)

#### ⚡ **PERFORMANCE & OPTIMIZATION**
- Memory management and garbage collection considerations
- Time complexity analysis for operations
- Concurrent collections and thread safety
- Caching strategies and lazy loading
- Profiling and benchmarking techniques
- JVM optimization flags and tuning

#### 🔗 **FRAMEWORK & LIBRARY INTEGRATIONS**
Include syntax for ALL relevant Java frameworks and libraries:
- **Collections Framework**: List, Set, Map, Queue implementations
- **Spring Framework**: Dependency injection, AOP, MVC patterns
- **Hibernate/JPA**: ORM operations, entity management
- **Apache Commons**: Utility libraries and helper methods
- **Google Guava**: Enhanced collections and utilities
- **Jackson**: JSON parsing and serialization
- **JUnit/TestNG**: Testing frameworks and assertions
- **Log4j/SLF4J**: Logging configurations and usage
- **Apache Maven/Gradle**: Build tool configurations
- **Servlet API**: Web development patterns
- **JDBC**: Database connectivity and operations
- **NIO**: Non-blocking I/O operations
- **Concurrency Utilities**: ExecutorService, CompletableFuture
- **Any other relevant frameworks**

#### 🛠️ **UTILITY PATTERNS & BEST PRACTICES**
- Design patterns implementations (Singleton, Factory, Observer, etc.)
- SOLID principles examples
- Exception handling strategies
- Resource management (try-with-resources)
- Lambda expressions and method references
- Functional programming techniques

#### 🔐 **ERROR HANDLING & VALIDATION**
- Try-catch-finally patterns for all operations
- Checked vs unchecked exception handling
- Custom exception creation and usage
- Input validation and sanitization
- Defensive programming patterns
- Assertion usage and testing strategies

#### 🎨 **ADVANCED PATTERNS & IDIOMS**
- Java idioms and best practices
- Enterprise design patterns
- Microservices patterns
- Reactive programming (RxJava, Project Reactor)
- Annotation processing and code generation
- Aspect-oriented programming

#### 🔧 **DEBUGGING & INSPECTION**
- Debugging tools and techniques
- JVM monitoring and profiling
- Memory leak detection
- Performance analysis
- Unit testing and integration testing
- Code coverage and quality metrics

#### 📝 **PRACTICAL EXAMPLES & USE CASES**
- Real-world enterprise application scenarios
- Common programming patterns and solutions
- Integration with databases and external APIs
- Web service development patterns
- Batch processing and data manipulation
- Security implementation patterns

**FORMATTING REQUIREMENTS:**

- Use backticks (\`) around ALL Java code in the syntax column for clean rendering
- Include parameter types and return types where relevant
- Show exception declarations and handling
- Provide complexity information (O(n), O(1), etc.) where applicable
- Group related operations logically
- Use clear, descriptive explanations
- Include common pitfalls and gotchas
- Show both simple and enterprise-level usage
- Include package imports where necessary

**QUALITY STANDARDS:**

- This must be the COMPLETE, DEFINITIVE Java reference
- Include edge cases and special scenarios
- Cover both basic and enterprise-level use cases  
- Provide production-ready examples
- Include performance and security implications
- Show integration with popular Java frameworks
- Cover both legacy and modern Java features
- Include Java 8+ features (lambdas, streams, modules)
- Show thread safety considerations
- Include memory management best practices

**DEPTH REQUIREMENTS:**

For "${topicName}", include:
- Every single method, class, and interface
- All parameter variations and method overloads
- Framework-specific implementations and patterns
- Enterprise architecture considerations
- Version-specific features (Java 8, 11, 17, 21+)
- Integration patterns with other Java technologies
- Common algorithms and data structure implementations
- Industry best practices and design patterns
- Performance optimization techniques
- Security considerations and implementations
- Testing strategies and frameworks

**STRUCTURE:**
Organize the table logically with sections but keep everything in ONE comprehensive table. Use clear section headers within the descriptions to group related operations.

Remember: This should be the most comprehensive Java syntax reference ever created for "${topicName}" - leave nothing out! Use clean backtick formatting for code to ensure proper rendering and cover every aspect from basic syntax to enterprise patterns.`;

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

    // Step 1: Get current java_syntax counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('java_syntax')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch java_syntax counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.java_syntax || 0;
    const nextSyntaxId = currentCount + 1;

    // Step 2: Get the next java syntax topic
    let query = supabase
      .from('java_syntax')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next syntax based on counter
      query = query.eq('id', nextSyntaxId);
    } else {
      query = query.eq('id', nextSyntaxId);
    }

    const { data: syntaxData, error: syntaxError } = await query;

    if (syntaxError) {
      console.error('Error fetching java syntax:', syntaxError);
      return NextResponse.json(
        { error: 'Database error while fetching java syntax', details: syntaxError.message },
        { status: 500 }
      );
    }

    if (!syntaxData || syntaxData.length === 0) {
      console.log(`No java syntax found with ID ${nextSyntaxId}. Current counter: ${currentCount}`);
      
      // Check if there are any syntax topics in the table at all
      const { data: allSyntax, error: countError } = await supabase
        .from('java_syntax')
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

    const syntax = syntaxData[0] as JavaSyntax;

    // Step 3: Generate ultra-comprehensive Java syntax reference
    const prompt = createJavaSyntaxPrompt(syntax.name);
    console.log('Generating ULTRA-COMPREHENSIVE syntax reference for:', syntax.id, '-', syntax.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the ultimate Java expert and master educator with encyclopedic knowledge of Java syntax, frameworks, enterprise patterns, and advanced techniques. You create the most comprehensive, exhaustive syntax references that serve as definitive guides covering every possible operation, method, class, design pattern, and usage technique. Your references are legendary for their completeness and practical value in enterprise development. Always use backticks (`) around ALL Java code in tables for clean rendering and provide exhaustive coverage with clear organization."
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
      .from('java_syntax')
      .update({ 
        theory: generatedTheory
      })
      .eq('id', syntax.id);

    if (updateError) {
      console.error('Error updating java syntax with theory:', updateError);
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
          java_syntax: syntax.id
        })
        .eq('java_syntax', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    // Calculate Java-specific metrics
    const syntaxCount = (generatedTheory.match(/`[^`]+`/g) || []).length;
    const tableEntries = (generatedTheory.match(/\|.*?\|.*?\|/g) || []).length - 1;
    const libraryReferences = (generatedTheory.match(/import\s+[\w.]+|@\w+|\w+\./g) || []).length;
    const methodCount = (generatedTheory.match(/\w+\(/g) || []).length;
    const classCount = (generatedTheory.match(/class\s+\w+|interface\s+\w+|enum\s+\w+/g) || []).length;

    return NextResponse.json({
      success: true,
      syntaxId: syntax.id,
      syntaxName: syntax.name,
      theory: generatedTheory,
      previousCount: currentCount,
      newCount: syntax.id,
      theoryLength: generatedTheory.length,
      wordCount: generatedTheory.split(' ').length,
      syntaxCount,
      tableEntries,
      libraryReferences,
      methodCount,
      classCount,
      comprehensiveScore: Math.round((syntaxCount + tableEntries + libraryReferences + methodCount) / 15),
      message: 'Ultra-comprehensive Java syntax reference generated and saved successfully'
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
          const result = await processJavaSyntax(id);
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
        totalMethodsDocumented: successfulResults.reduce((acc, r) => acc + r.methodCount, 0),
        totalClassesDocumented: successfulResults.reduce((acc, r) => acc + r.classCount, 0),
        message: `Processed ${successfulResults.length} out of ${syntaxIds.length} Java syntax topics with comprehensive coverage`
      });
    }

    // Handle single syntax processing
    if (syntaxId) {
      const result = await processJavaSyntax(syntaxId);
      return NextResponse.json(result);
    }

    // Handle processing syntax topics without theories
    let query = supabase
      .from('java_syntax')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: syntaxTopics, error } = await query;

    if (error || !syntaxTopics || syntaxTopics.length === 0) {
      return NextResponse.json(
        { error: 'No Java syntax topics without theories found' },
        { status: 404 }
      );
    }

    const results: BatchResult[] = [];
    for (const syntaxTopic of syntaxTopics) {
      try {
        const result = await processJavaSyntax(syntaxTopic.id);
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
      totalMethodsDocumented: successfulResults.reduce((acc, r) => acc + r.methodCount, 0),
      message: `Processed ${successfulResults.length} Java syntax topics without theories with comprehensive coverage`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual Java syntax topics with enhanced coverage
async function processJavaSyntax(syntaxId: number): Promise<ProcessResult> {
  const { data: syntaxData, error: syntaxError } = await supabase
    .from('java_syntax')
    .select('*')
    .eq('id', syntaxId)
    .single();

  if (syntaxError || !syntaxData) {
    throw new Error(`Java syntax topic ${syntaxId} not found`);
  }

  const syntax = syntaxData as JavaSyntax;
  
  const prompt = createJavaSyntaxPrompt(syntax.name);
  console.log(`Processing ultra-comprehensive Java syntax for: ${syntax.name} (ID: ${syntaxId})`);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are the ultimate Java master with complete knowledge of Java syntax, JDK, popular frameworks (Spring, Hibernate, Apache Commons, Google Guava, etc.), enterprise patterns, performance optimizations, and industry best practices. You create exhaustive syntax references that cover every possible operation, method, class, design pattern, and usage technique. Your references are comprehensive enough to serve as complete language documentation for specific Java topics. Always use backticks around Java code in tables and ensure maximum coverage and practical enterprise value."
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
    .from('java_syntax')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', syntaxId);

  if (updateError) {
    throw new Error(`Failed to save comprehensive Java syntax reference for topic ${syntaxId}`);
  }

  // Calculate Java-specific comprehensive metrics
  const syntaxCount = (generatedTheory.match(/`[^`]+`/g) || []).length;
  const tableEntries = (generatedTheory.match(/\|.*?\|.*?\|/g) || []).length - 1;
  const libraryReferences = (generatedTheory.match(/import\s+[\w.]+|@\w+|\w+\./g) || []).length;
  const methodCount = (generatedTheory.match(/\w+\(/g) || []).length;
  const classCount = (generatedTheory.match(/class\s+\w+|interface\s+\w+|enum\s+\w+/g) || []).length;

  return {
    success: true,
    syntaxId,
    syntaxName: syntax.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    syntaxCount,
    tableEntries,
    libraryReferences,
    methodCount,
    classCount,
    comprehensiveScore: Math.round((syntaxCount + tableEntries + libraryReferences + methodCount) / 15),
    message: 'Ultra-comprehensive Java syntax reference generated successfully'
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
      const result = await processJavaSyntax(syntaxId);
      return NextResponse.json({
        ...result,
        message: 'Ultra-comprehensive Java syntax reference regenerated successfully'
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
        .update({ java_syntax: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Java syntax counter reset to 0 - ready for comprehensive generation'
      });
    }
    
    if (resetTheory && syntaxId) {
      const { error: resetError } = await supabase
        .from('java_syntax')
        .update({ theory: null })
        .eq('id', syntaxId);
      
      if (resetError) {
        throw new Error(`Failed to reset theory for Java syntax topic ${syntaxId}`);
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