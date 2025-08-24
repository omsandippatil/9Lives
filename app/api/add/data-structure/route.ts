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
  apiKey: process.env.DS_GROQ_API_KEY!,
});

interface DataStructure {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  data_structure: number;
}

// Enhanced prompt for generating comprehensive data structure theories
const createDataStructurePrompt = (dataStructureName: string) => `
You are a distinguished computer science professor and software engineering expert with decades of experience teaching data structures and algorithms. You have deep expertise in both theoretical computer science and practical implementation across multiple programming languages. You will generate a COMPREHENSIVE, DETAILED, and PEDAGOGICALLY RIGOROUS explanation about the data structure topic provided, focusing specifically on Java and Python implementations.

**Data Structure Topic**: "${dataStructureName}"

## RESPONSE FORMAT REQUIREMENTS:

Your response MUST be a comprehensive data structure deep-dive that covers EVERY aspect of the data structure from theory to practical implementation. You have complete autonomy to decide the headings and structure based on what makes most sense for this specific data structure. The response should be formatted as a detailed educational document that could serve as both a learning resource and implementation guide.

## MANDATORY CONTENT AREAS TO COVER:

### 📚 FUNDAMENTAL CONCEPTS & DEFINITION
- **What Is It (Definition)**: Clear, concise definition of the data structure and its core concept — **(Essential)** (forces clarity)
- **Mathematical Definition**: Formal mathematical representation or notation if applicable — **(Essential)** (formal definition)
- **Abstract Data Type (ADT) Specification**: Complete ADT definition with operations and properties — **(Essential)** (ADT clarity)
- **Problem It Solves**: What specific computational or organizational problems this data structure addresses — **(Essential)** (functional purpose)
- **Key Characteristics**: Fundamental properties that define this data structure — **(Essential)** (distinguishing features)
- **Invariants & Properties**: Mathematical invariants and properties that must always hold — **(Essential)** (structural integrity)
- **Real-World Analogies**: Practical analogies that help understand the concept — **(Essential)** (aids comprehension)
- **Historical Context**: Brief history and evolution of the data structure — **(Useful)** (context)
- **Vocabulary: Key Terms**: Important terminology and concepts specific to this data structure — **(Essential)** (glossary)

### 🏗️ STRUCTURE & ORGANIZATION
- **Internal Structure**: How data is organized internally within the structure — **(Essential)**
- **Memory Layout**: How the data structure is stored in memory with diagrams — **(Essential)**
- **Logical vs Physical Structure**: Distinction between logical organization and physical storage — **(Essential)**
- **Node/Element Definition**: Detailed structure of individual elements or nodes — **(Essential)**
- **Relationships Between Elements**: How elements relate to each other within the structure — **(Essential)**
- **Capacity & Size Concepts**: Fixed vs dynamic sizing, capacity vs actual size — **(Essential)**
- **Indexing & Addressing**: How elements are accessed and referenced — **(Essential)**
- **Pointer Structures**: How pointers/references connect elements (if applicable) — **(Essential)**

### ⚙️ CORE OPERATIONS & METHODS
- **Essential Operations**: Fundamental operations that define the data structure — **(Essential)**
- **Operation Signatures**: Detailed method signatures for all operations — **(Essential)**
- **CRUD Operations**: Create, Read, Update, Delete operations and their variants — **(Essential)**
- **Constructor Operations**: How to initialize and create the data structure — **(Essential)**
- **Insertion Operations**: All methods to add elements with parameters — **(Essential)**
- **Deletion Operations**: All methods to remove elements with parameters — **(Essential)**
- **Access Operations**: Methods to retrieve or view elements — **(Essential)**
- **Search Operations**: How to find elements within the structure — **(Essential)**
- **Traversal Methods**: Different ways to iterate through or visit elements — **(Essential)**
- **Modification Operations**: How to update existing elements — **(Essential)**
- **Utility Operations**: Helper methods like size(), isEmpty(), clear() — **(Essential)**
- **Comparison Operations**: Methods for comparing elements or structures — **(Essential)**

### 📊 TIME & SPACE COMPLEXITY
- **Time Complexity Analysis**: Big O analysis for all major operations with detailed breakdown — **(Essential)**
- **Space Complexity**: Memory usage patterns and overhead analysis — **(Essential)**
- **Best, Average, Worst Cases**: Complexity analysis under different scenarios with examples — **(Essential)**
- **Amortized Analysis**: When applicable, amortized complexity discussion with proofs — **(Useful)**
- **Comparison with Alternatives**: Complexity comparison table with similar structures — **(Essential)**
- **Performance Trade-offs**: What you gain vs what you sacrifice with specific scenarios — **(Essential)**
- **Complexity Proof Sketches**: Brief mathematical justifications for complexity claims — **(Useful)**

### ☕ JAVA IMPLEMENTATION
- **Built-in Java Support**: Native Java classes and interfaces for this data structure — **(Essential)**
- **Standard Library Classes**: Complete coverage of java.util classes that implement this structure — **(Essential)**
- **Interface Definitions**: Relevant Java interfaces (List, Set, Map, etc.) — **(Essential)**
- **Custom Implementation**: Complete, production-ready implementation from scratch in Java — **(Essential)**
- **Generic Implementation**: How to make the structure type-safe with generics — **(Essential)**
- **Method Implementations**: Detailed implementation of all core methods — **(Essential)**
- **Exception Handling**: Proper error handling and custom exceptions — **(Essential)**
- **Java-Specific Features**: Collections framework integration, Comparable, Iterator — **(Essential)**
- **Memory Management**: How Java handles memory for this structure — **(Useful)**
- **Thread Safety**: Concurrent access considerations and thread-safe variants — **(Useful)**
- **Best Practices**: Java-specific implementation best practices and patterns — **(Essential)**

### 🐍 PYTHON IMPLEMENTATION
- **Built-in Python Support**: Native Python data types and structures — **(Essential)**
- **Standard Library**: Complete coverage of Python modules and classes — **(Essential)**
- **Magic Methods**: __init__, __len__, __getitem__, __setitem__, etc. — **(Essential)**
- **Custom Implementation**: Complete, production-ready implementation from scratch in Python — **(Essential)**
- **Method Implementations**: Detailed implementation of all core methods — **(Essential)**
- **Exception Handling**: Proper Python exception handling — **(Essential)**
- **Pythonic Approaches**: Idiomatic Python ways to work with this structure — **(Essential)**
- **Iterator Protocol**: Implementing __iter__ and __next__ methods — **(Essential)**
- **Property Decorators**: Using @property for computed attributes — **(Useful)**
- **Type Hints**: Modern Python typing for better code documentation — **(Essential)**
- **Memory Management**: Python's memory handling for this structure — **(Useful)**
- **Performance Considerations**: CPython implementation details — **(Useful)**

### 💻 CODE EXAMPLES & IMPLEMENTATIONS
- **Complete Working Examples**: Full implementations with all methods — **(Essential)**
- **Basic Usage Examples**: Simple code snippets showing common operations — **(Essential)**
- **Advanced Usage Examples**: Complex scenarios and edge cases — **(Essential)**
- **Algorithmic Patterns**: Common algorithms that use this data structure — **(Essential)**
- **Real-world Code Examples**: Practical applications with context — **(Essential)**
- **Testing Code**: Unit tests and validation examples — **(Useful)**
- **Performance Benchmarking**: Code to measure and compare performance — **(Useful)**
- **Error Handling Examples**: Robust error handling in practice — **(Essential)**

### 🎯 PRACTICAL APPLICATIONS & USE CASES
- **Common Use Cases**: Where this data structure is typically used with examples — **(Essential)**
- **Problem-Solving Patterns**: Types of problems this structure helps solve — **(Essential)**
- **Algorithm Integration**: Specific algorithms that rely on this data structure — **(Essential)**
- **System Design Context**: How this structure fits in larger system designs — **(Useful)**
- **Industry Applications**: Real-world applications in different domains — **(Useful)**
- **Performance Requirements**: When performance characteristics match needs — **(Essential)**
- **Scale Considerations**: How the structure behaves at different scales — **(Essential)**
- **When to Choose This Structure**: Decision matrix and criteria — **(Essential)**

### 🧠 INTERVIEW QUESTIONS & PROBLEMS
- **Common Interview Questions**: Typical questions asked about this data structure — **(Essential)**
- **Coding Problems**: Popular coding interview problems that use this structure — **(Essential)**
- **Problem-Solving Strategies**: How to approach problems involving this structure — **(Essential)**
- **Implementation Challenges**: What interviewers often ask you to implement — **(Essential)**
- **Optimization Questions**: Performance and space optimization challenges — **(Essential)**
- **Conceptual Questions**: Theoretical questions about properties and trade-offs — **(Essential)**
- **Comparison Questions**: "When would you use X vs Y?" type questions — **(Essential)**

### ⚖️ ADVANTAGES & DISADVANTAGES
- **Strengths**: What this data structure excels at with specific examples — **(Essential)**
- **Weaknesses**: Limitations and drawbacks with specific scenarios — **(Essential)**
- **Trade-off Analysis**: Detailed comparison of benefits vs costs — **(Essential)**
- **Performance Characteristics**: Speed vs memory vs complexity trade-offs — **(Essential)**
- **Suitable Scenarios**: When this structure is the optimal choice — **(Essential)**
- **Unsuitable Scenarios**: When to avoid this structure with reasons — **(Essential)**
- **Alternative Considerations**: When other structures might be better — **(Essential)**

### 🔄 VARIATIONS & RELATED STRUCTURES
- **Common Variants**: Different versions or implementations of this structure — **(Essential)**
- **Specialized Versions**: Optimized or specialized variants with use cases — **(Useful)**
- **Related Data Structures**: Similar or complementary structures with comparisons — **(Essential)**
- **Hybrid Approaches**: Combinations with other structures — **(Useful)**
- **Evolution & Improvements**: How the structure has evolved over time — **(Useful)**
- **Extended Versions**: Enhanced versions with additional features — **(Useful)**

### 🛠️ IMPLEMENTATION DETAILS & TECHNIQUES
- **Construction & Initialization**: Multiple ways to create and set up the structure — **(Essential)**
- **Memory Allocation Strategies**: How memory is allocated and managed — **(Essential)**
- **Destruction & Cleanup**: Memory management and cleanup considerations — **(Essential)**
- **Iterator Implementation**: How to implement and use iterators properly — **(Essential)**
- **Serialization & Persistence**: How to save and restore the structure — **(Useful)**
- **Cloning & Copying**: Deep vs shallow copying with implementations — **(Useful)**
- **Comparison Operations**: How to implement equality and ordering — **(Useful)**
- **Hashing**: If applicable, how to implement hash functions — **(Useful)**

### 🔍 DEBUGGING & OPTIMIZATION
- **Common Implementation Mistakes**: Typical errors with prevention strategies — **(Essential)**
- **Debugging Techniques**: How to debug problems with this structure — **(Essential)**
- **Performance Optimization**: Specific techniques to improve performance — **(Essential)**
- **Memory Optimization**: Strategies to reduce memory usage — **(Useful)**
- **Profiling & Analysis**: How to measure and analyze performance — **(Useful)**
- **Code Review Checklist**: What to look for when reviewing implementations — **(Useful)**

### 📈 ADVANCED TOPICS & EXTENSIONS
- **Concurrent Implementations**: Thread-safe versions and patterns — **(Useful)**
- **Lock-free Implementations**: Advanced concurrent programming techniques — **(Useful)**
- **Persistent Versions**: Immutable or persistent variants — **(Useful)**
- **Cache-Aware Implementations**: Memory hierarchy optimizations — **(Useful)**
- **External Storage**: Disk-based or distributed versions — **(Useful)**
- **Functional Programming Aspects**: How this structure fits in FP — **(Useful)**
- **Generic Programming**: Template/generic implementations — **(Useful)**

### 🎓 THEORETICAL FOUNDATIONS
- **Mathematical Background**: Mathematical concepts underlying the structure — **(Useful)**
- **Complexity Theory**: Theoretical limits and lower bounds — **(Useful)**
- **Formal Verification**: How to formally verify properties — **(Useful)**
- **Category Theory**: If applicable, categorical perspectives — **(Useful)**
- **Graph Theory**: If applicable, graph-theoretic properties — **(Useful)**

---

## FORMATTING AND STYLE REQUIREMENTS:

- **IMPORTANT**: Add one appropriate emoji at the start of EVERY main heading to make the content visually engaging
- Use proper markdown formatting with multiple heading levels (##, ###, ####)
- Include comprehensive code examples in both Java and Python using markdown code blocks with proper syntax highlighting
- Use tables for complexity analysis, comparisons, method signatures, and structured data
- Include mathematical formulas or complexity notations using standard notation
- Use bullet points and numbered lists for clarity and organization
- Bold important concepts, operations, terminology, and method names
- Create clear visual separation between major sections
- Use inline code formatting for method names, class names, variables, and small code snippets
- Include ASCII diagrams where helpful for visualizing structure

## TECHNICAL DEPTH REQUIREMENTS:

- **Implementation Focus**: Include complete, runnable, production-ready code examples
- **Method Signatures**: Show exact method signatures with parameters and return types
- **Error Cases**: Cover edge cases, error conditions, and exception handling
- **Performance Analysis**: Detailed complexity analysis with justifications
- **Practical Examples**: Real-world code that solves actual problems
- **Interview Preparation**: Include common questions and problem-solving approaches
- **Technical Precision**: Use accurate computer science terminology throughout
- **Multi-language Perspective**: Show how concepts differ between Java and Python
- **Complete Coverage**: Address every significant technical aspect

## STRUCTURE FLEXIBILITY:

You have complete freedom to organize the content using headings that make the most sense for this specific data structure. The categories above are comprehensive guidelines - adapt, modify, merge, or create new headings as needed to best explain this particular data structure. Some structures might need more focus on mathematical properties, others on algorithmic applications, others on implementation details, etc.

## AUDIENCE CONSIDERATION:

Write for a technical audience that includes:
- Computer science students preparing for exams and interviews
- Software developers implementing data structures in production code
- Algorithm designers choosing appropriate structures for specific problems
- Technical interviewers and interviewees
- Anyone who needs to understand, implement, debug, or optimize this data structure

The explanation should be thorough enough that someone could:
1. **Understand** the theoretical foundations and mathematical properties
2. **Implement** the structure from scratch in both Java and Python
3. **Debug** common implementation issues
4. **Optimize** performance for specific use cases
5. **Interview** confidently about this data structure
6. **Choose** when to use this structure vs alternatives

Remember: This should read like a comprehensive computer science textbook chapter combined with a senior developer's implementation guide. Make it authoritative, technically precise, and practically useful while being engaging and well-structured. ALWAYS add appropriate emojis to ALL main headings for visual appeal. Focus exclusively on Java and Python implementations with complete, runnable code examples that demonstrate every concept discussed.`;

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

    // Step 1: Get current data structure counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('data_structure')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch data structure counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.data_structure || 0;
    const nextStructureId = currentCount + 1;

    // Step 2: Get the next data structure
    let query = supabase
      .from('data_structure')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next structure based on counter
      query = query.eq('id', nextStructureId);
    } else {
      query = query.eq('id', nextStructureId);
    }

    const { data: structuresData, error: structureError } = await query;

    if (structureError) {
      console.error('Error fetching data structure:', structureError);
      return NextResponse.json(
        { error: 'Database error while fetching data structure', details: structureError.message },
        { status: 500 }
      );
    }

    if (!structuresData || structuresData.length === 0) {
      console.log(`No data structure found with ID ${nextStructureId}. Current counter: ${currentCount}`);
      
      // Check if there are any structures in the table at all
      const { data: allStructures, error: countError } = await supabase
        .from('data_structure')
        .select('id')
        .order('id', { ascending: true });
        
      if (countError) {
        return NextResponse.json(
          { error: 'Failed to check available data structures' },
          { status: 500 }
        );
      }
      
      const totalStructures = allStructures?.length || 0;
      
      return NextResponse.json(
        { 
          error: 'No more data structures available or structure not found',
          details: {
            requestedStructureId: nextStructureId,
            currentCounter: currentCount,
            totalStructuresInRepo: totalStructures,
            availableStructureIds: allStructures?.map(s => s.id) || []
          }
        },
        { status: 404 }
      );
    }

    const structure = structuresData[0] as DataStructure;

    // Step 3: Generate comprehensive data structure theory using Groq
    const prompt = createDataStructurePrompt(structure.name);
    console.log('Generating theory for data structure:', structure.id, '-', structure.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a distinguished computer science professor and software engineering expert creating comprehensive educational materials about data structures. You create detailed, pedagogically rigorous explanations that serve as both learning resources and implementation guides. Your explanations combine theoretical computer science knowledge with practical implementation details in Java and Python. You have complete autonomy to structure your response with appropriate headings that best explain the specific data structure. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging and easier to navigate."
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
      .from('data_structure')
      .update({ 
        theory: generatedTheory
      })
      .eq('id', structure.id);

    if (updateError) {
      console.error('Error updating structure with theory:', updateError);
      return NextResponse.json(
        { error: 'Failed to save theory' },
        { status: 500 }
      );
    }

    // Step 5: Update counter only if processing sequentially
    if (!forceRegenerate && structure.id === nextStructureId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          data_structure: structure.id
        })
        .eq('data_structure', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      structureId: structure.id,
      structureName: structure.name,
      theory: generatedTheory,
      previousCount: currentCount,
      newCount: structure.id,
      theoryLength: generatedTheory.length,
      wordCount: generatedTheory.split(' ').length,
      estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
      message: 'Comprehensive data structure theory generated and saved successfully'
    });

  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method for targeted structure processing
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
    const { structureId, structureIds, batchSize = 3 } = body;
    
    // Handle batch processing
    if (structureIds && Array.isArray(structureIds)) {
      const results = [];
      
      for (const id of structureIds.slice(0, batchSize)) {
        try {
          const result = await processDataStructure(id);
          results.push(result);
        } catch (error) {
          results.push({
            structureId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: results.filter(r => r.success).length,
        totalRequested: structureIds.length,
        message: `Processed ${results.filter(r => r.success).length} out of ${structureIds.length} data structures`
      });
    }

    // Handle single structure processing
    if (structureId) {
      const result = await processDataStructure(structureId);
      return NextResponse.json(result);
    }

    // Handle processing structures without theories
    let query = supabase
      .from('data_structure')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: structures, error } = await query;

    if (error || !structures || structures.length === 0) {
      return NextResponse.json(
        { error: 'No data structures without theories found' },
        { status: 404 }
      );
    }

    const results = [];
    for (const structure of structures) {
      try {
        const result = await processDataStructure(structure.id);
        results.push(result);
      } catch (error) {
        results.push({
          structureId: structure.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      batchResults: results,
      processedCount: results.filter(r => r.success).length,
      message: `Processed ${results.filter(r => r.success).length} data structures without theories`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual data structures
async function processDataStructure(structureId: number) {
  const { data: structureData, error: structureError } = await supabase
    .from('data_structure')
    .select('*')
    .eq('id', structureId)
    .single();

  if (structureError || !structureData) {
    throw new Error(`Data structure ${structureId} not found`);
  }

  const structure = structureData as DataStructure;
  
  const prompt = createDataStructurePrompt(structure.name);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a distinguished computer science professor creating comprehensive educational materials about data structures. You structure content with clear, logical headings that best explain each specific data structure. Your explanations combine theoretical knowledge with practical Java and Python implementations. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging."
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
    .from('data_structure')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', structureId);

  if (updateError) {
    throw new Error(`Failed to save theory for data structure ${structureId}`);
  }

  return {
    success: true,
    structureId,
    structureName: structure.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
    message: 'Data structure theory generated successfully'
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

    const { structureId, regenerateTheory = false } = await request.json();
    
    if (!structureId) {
      return NextResponse.json(
        { error: 'Structure ID is required' },
        { status: 400 }
      );
    }

    if (regenerateTheory) {
      const result = await processDataStructure(structureId);
      return NextResponse.json({
        ...result,
        message: 'Data structure theory regenerated successfully'
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

// DELETE method for removing structures or resetting theories
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

    const { structureId, resetTheory = false, resetCounter = false } = await request.json();
    
    if (resetCounter) {
      const { error: resetError } = await supabase
        .from('questions_done')
        .update({ data_structure: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'Data structures counter reset to 0'
      });
    }
    
    if (resetTheory && structureId) {
      const { error: resetError } = await supabase
        .from('data_structure')
        .update({ theory: null })
        .eq('id', structureId);
      
      if (resetError) {
        throw new Error(`Failed to reset theory for structure ${structureId}`);
      }
      
      return NextResponse.json({
        success: true,
        structureId,
        message: 'Theory reset successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify structureId with resetTheory: true, or resetCounter: true' },
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