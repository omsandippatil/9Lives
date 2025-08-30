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
  apiKey: process.env.SQL_LANG_THEORY_GROQ_API_KEY!,
});

interface SqlSyntax {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  sql_syntax: number;
}

interface ProcessResult {
  success: boolean;
  syntaxId: number;
  syntaxName: string;
  theoryLength: number;
  wordCount: number;
  syntaxCount: number;
  tableEntries: number;
  databaseEngines: number;
  queryCount: number;
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

// Ultra-comprehensive prompt for generating complete SQL syntax reference
const createSqlSyntaxPrompt = (topicName: string) => `
You are the ultimate SQL expert and database architect creating the most comprehensive, exhaustive SQL syntax reference guide ever made. This will be the definitive resource for developers, database administrators, data analysts, and professionals who need complete coverage of SQL syntax patterns, database operations, functions, optimization techniques, and advanced usage across all major database engines.

**Topic**: "${topicName}"

## CRITICAL REQUIREMENTS:

You MUST provide the most comprehensive coverage possible, including:

### 📖 Brief Introduction
- Write a focused 2-3 sentence introduction about the topic
- Explain what this SQL syntax category encompasses across different database systems
- Mention key database engines, standards (ANSI SQL, SQL:2016, etc.), and related technologies

### 📋 EXHAUSTIVE SQL SYNTAX REFERENCE TABLE

Create the most comprehensive 2-column table covering EVERY possible SQL syntax, operation, function, clause, statement, optimization technique, and usage pattern for this topic across ALL major database engines.

**MANDATORY Table Format:**
| SQL Syntax | Usage/Description |
|------------|-------------------|
| \`exact_sql_syntax_here\` | Detailed description with use cases, parameters, return values, database compatibility, performance implications, and practical examples |

**IMPORTANT FORMATTING RULES:**
- Use backticks (\`) around SQL code in the syntax column, NOT $$
- Keep descriptions clean and readable without nested formatting
- Example: \`SELECT COUNT(*) FROM table_name;\` | Returns the total number of rows in the specified table, works across all major database engines

**ULTRA-COMPREHENSIVE COVERAGE REQUIREMENTS:**

Include ALL of the following categories with EVERY possible syntax variation:

#### 🏗️ **DATABASE & TABLE OPERATIONS**
- All DDL operations (CREATE, ALTER, DROP, TRUNCATE)
- Schema design and management
- Table creation with all constraint types
- Index creation and management strategies
- View, materialized view, and CTE operations
- Stored procedures, functions, and triggers
- User-defined types and domains

#### 🔧 **DATA MANIPULATION (DML)**
- All INSERT variations (single, bulk, conditional)
- UPDATE operations (simple, joins, subqueries, MERGE)
- DELETE operations (simple, cascading, conditional)
- SELECT statements with all possible clauses
- UPSERT and MERGE operations
- Bulk operations and batch processing

#### 📚 **BUILT-IN FUNCTIONS & OPERATORS**
- **String Functions**: CONCAT, SUBSTRING, TRIM, REPLACE, LENGTH, etc.
- **Date/Time Functions**: NOW(), DATEADD, DATEDIFF, EXTRACT, etc.
- **Numeric Functions**: ROUND, CEILING, FLOOR, ABS, MOD, etc.
- **Aggregate Functions**: SUM, COUNT, AVG, MIN, MAX, STDDEV, etc.
- **Window Functions**: ROW_NUMBER(), RANK(), LAG, LEAD, etc.
- **Conditional Functions**: CASE, COALESCE, NULLIF, IIF, etc.
- **Type Conversion**: CAST, CONVERT, TO_CHAR, TO_DATE, etc.

#### 🎯 **ADVANCED QUERY OPERATIONS**
- Complex JOINs (INNER, LEFT, RIGHT, FULL OUTER, CROSS, SELF)
- Subqueries (correlated, non-correlated, EXISTS, IN)
- Common Table Expressions (CTEs) and recursive queries
- UNION, INTERSECT, EXCEPT operations
- Window functions and analytical queries
- Pivot and unpivot operations
- Query optimization techniques

#### 🔄 **DATA TYPES & CONSTRAINTS**
- All data types across database engines
- Primary key, foreign key, unique constraints
- Check constraints and custom validations
- Default values and auto-increment
- NULL handling and NOT NULL constraints
- Domain constraints and user-defined types

#### 📊 **AGGREGATION & GROUPING**
- GROUP BY with all variations
- HAVING clause filtering
- ROLLUP, CUBE, GROUPING SETS
- Window functions for analytics
- Statistical functions and calculations
- Time-series aggregations

#### 🔍 **FILTERING & SEARCH OPERATIONS**
- WHERE clause with all operators
- Pattern matching (LIKE, REGEXP, SIMILAR TO)
- Full-text search capabilities
- Range queries and between operations
- NULL comparisons and handling
- Complex boolean logic

#### ⚡ **PERFORMANCE & OPTIMIZATION**
- Index usage and optimization strategies
- Query execution plans and analysis
- Performance tuning techniques
- Partitioning strategies
- Query hints and optimizer directives
- Statistics and cost-based optimization
- Connection pooling and resource management

#### 🔗 **DATABASE ENGINE SPECIFIC FEATURES**
Include syntax for ALL major database engines:
- **MySQL**: Specific functions, storage engines, replication
- **PostgreSQL**: Advanced features, extensions, arrays, JSON
- **SQL Server**: T-SQL specific syntax, CLR integration
- **Oracle**: PL/SQL, packages, advanced analytics
- **SQLite**: Lightweight operations, pragma statements
- **MariaDB**: Specific enhancements and features
- **DB2**: Enterprise features and optimization
- **Snowflake**: Cloud data warehouse features
- **BigQuery**: Analytics and large-scale operations
- **Redshift**: Data warehouse specific operations
- **NoSQL Integration**: MongoDB, Cassandra SQL interfaces

#### 🛠️ **TRANSACTION MANAGEMENT**
- BEGIN, COMMIT, ROLLBACK operations
- Transaction isolation levels
- Savepoints and nested transactions
- Lock management and concurrency control
- Deadlock detection and resolution
- ACID properties implementation

#### 🔐 **SECURITY & PERMISSIONS**
- GRANT and REVOKE statements
- Role-based access control
- Row-level security implementations
- Data masking and encryption
- Audit trail and logging
- SQL injection prevention techniques

#### 🎨 **ADVANCED DATABASE PATTERNS**
- Temporal tables and versioning
- Change data capture (CDC)
- Database replication patterns
- Sharding and partitioning strategies
- Data archiving and lifecycle management
- ETL/ELT processing patterns

#### 🔧 **DATABASE ADMINISTRATION**
- Backup and restore operations
- Database maintenance and monitoring
- Performance monitoring queries
- System catalog queries
- Configuration and tuning parameters
- Automation and scripting patterns

#### 📝 **PRACTICAL EXAMPLES & USE CASES**
- Enterprise application scenarios
- Data warehousing patterns
- Business intelligence queries
- Reporting and analytics
- Data migration scripts
- Performance benchmarking queries
- Real-world optimization examples

**FORMATTING REQUIREMENTS:**

- Use backticks (\`) around ALL SQL code in the syntax column for clean rendering
- Include parameter types and return types where relevant
- Show database engine compatibility
- Provide performance implications (execution complexity)
- Group related operations logically
- Use clear, descriptive explanations
- Include common pitfalls and gotchas
- Show both basic and enterprise-level usage
- Include necessary syntax variations for different engines

**QUALITY STANDARDS:**

- This must be the COMPLETE, DEFINITIVE SQL reference
- Include edge cases and special scenarios
- Cover both OLTP and OLAP use cases
- Provide production-ready examples
- Include performance and scalability implications
- Show integration with popular frameworks and ORMs
- Cover both legacy and modern SQL features
- Include SQL standard compliance information
- Show concurrency and transaction considerations
- Include data modeling best practices

**DEPTH REQUIREMENTS:**

For "${topicName}", include:
- Every single function, operator, and clause
- All parameter variations and syntax overloads
- Database engine-specific implementations
- Enterprise and cloud database considerations
- Version-specific features across major databases
- Integration patterns with programming languages
- Common algorithms and query optimization techniques
- Industry best practices and design patterns
- Performance optimization techniques
- Security considerations and implementations
- Testing and validation strategies

**STRUCTURE:**
Organize the table logically with sections but keep everything in ONE comprehensive table. Use clear section headers within the descriptions to group related operations.

Remember: This should be the most comprehensive SQL syntax reference ever created for "${topicName}" - leave nothing out! Use clean backtick formatting for code to ensure proper rendering and cover every aspect from basic SQL to enterprise database management across all major database platforms.`;

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

    // Step 1: Get current sql_syntax counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('sql_syntax')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch sql_syntax counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.sql_syntax || 0;
    const nextSyntaxId = currentCount + 1;

    // Step 2: Get the next SQL syntax topic
    let query = supabase
      .from('sql_syntax')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next syntax based on counter
      query = query.eq('id', nextSyntaxId);
    } else {
      query = query.eq('id', nextSyntaxId);
    }

    const { data: syntaxData, error: syntaxError } = await query;

    if (syntaxError) {
      console.error('Error fetching SQL syntax:', syntaxError);
      return NextResponse.json(
        { error: 'Database error while fetching SQL syntax', details: syntaxError.message },
        { status: 500 }
      );
    }

    if (!syntaxData || syntaxData.length === 0) {
      console.log(`No SQL syntax found with ID ${nextSyntaxId}. Current counter: ${currentCount}`);
      
      // Check if there are any syntax topics in the table at all
      const { data: allSyntax, error: countError } = await supabase
        .from('sql_syntax')
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

    const syntax = syntaxData[0] as SqlSyntax;

    // Step 3: Generate ultra-comprehensive SQL syntax reference
    const prompt = createSqlSyntaxPrompt(syntax.name);
    console.log('Generating ULTRA-COMPREHENSIVE SQL syntax reference for:', syntax.id, '-', syntax.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are the ultimate SQL expert and database architect with encyclopedic knowledge of SQL syntax, database engines, query optimization, enterprise patterns, and advanced database techniques. You create the most comprehensive, exhaustive SQL syntax references that serve as definitive guides covering every possible operation, function, clause, optimization technique, and usage pattern across all major database platforms. Your references are legendary for their completeness and practical value in enterprise database development. Always use backticks (`) around ALL SQL code in tables for clean rendering and provide exhaustive coverage with clear organization."
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
      .from('sql_syntax')
      .update({ 
        theory: generatedTheory
      })
      .eq('id', syntax.id);

    if (updateError) {
      console.error('Error updating SQL syntax with theory:', updateError);
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
          sql_syntax: syntax.id
        })
        .eq('sql_syntax', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    // Calculate SQL-specific metrics
    const syntaxCount = (generatedTheory.match(/`[^`]+`/g) || []).length;
    const tableEntries = (generatedTheory.match(/\|.*?\|.*?\|/g) || []).length - 1;
    const databaseEngines = (generatedTheory.match(/MySQL|PostgreSQL|Oracle|SQL Server|SQLite|MariaDB|DB2|Snowflake|BigQuery|Redshift/gi) || []).length;
    const queryCount = (generatedTheory.match(/SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP/gi) || []).length;
    const functionCount = (generatedTheory.match(/\w+\(/g) || []).length;

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
      databaseEngines,
      queryCount,
      functionCount,
      comprehensiveScore: Math.round((syntaxCount + tableEntries + databaseEngines + queryCount) / 20),
      message: 'Ultra-comprehensive SQL syntax reference generated and saved successfully'
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
          const result = await processSqlSyntax(id);
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
        totalQueriesDocumented: successfulResults.reduce((acc, r) => acc + r.queryCount, 0),
        totalFunctionsDocumented: successfulResults.reduce((acc, r) => acc + r.functionCount, 0),
        message: `Processed ${successfulResults.length} out of ${syntaxIds.length} SQL syntax topics with comprehensive coverage`
      });
    }

    // Handle single syntax processing
    if (syntaxId) {
      const result = await processSqlSyntax(syntaxId);
      return NextResponse.json(result);
    }

    // Handle processing syntax topics without theories
    let query = supabase
      .from('sql_syntax')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: syntaxTopics, error } = await query;

    if (error || !syntaxTopics || syntaxTopics.length === 0) {
      return NextResponse.json(
        { error: 'No SQL syntax topics without theories found' },
        { status: 404 }
      );
    }

    const results: BatchResult[] = [];
    for (const syntaxTopic of syntaxTopics) {
      try {
        const result = await processSqlSyntax(syntaxTopic.id);
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
      totalQueriesDocumented: successfulResults.reduce((acc, r) => acc + r.queryCount, 0),
      message: `Processed ${successfulResults.length} SQL syntax topics without theories with comprehensive coverage`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual SQL syntax topics with enhanced coverage
async function processSqlSyntax(syntaxId: number): Promise<ProcessResult> {
  const { data: syntaxData, error: syntaxError } = await supabase
    .from('sql_syntax')
    .select('*')
    .eq('id', syntaxId)
    .single();

  if (syntaxError || !syntaxData) {
    throw new Error(`SQL syntax topic ${syntaxId} not found`);
  }

  const syntax = syntaxData as SqlSyntax;
  
  const prompt = createSqlSyntaxPrompt(syntax.name);
  console.log(`Processing ultra-comprehensive SQL syntax for: ${syntax.name} (ID: ${syntaxId})`);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are the ultimate SQL master with complete knowledge of SQL syntax, all major database engines (MySQL, PostgreSQL, Oracle, SQL Server, SQLite, etc.), query optimization, enterprise database patterns, performance tuning, and industry best practices. You create exhaustive SQL syntax references that cover every possible operation, function, clause, optimization technique, and usage pattern across all database platforms. Your references are comprehensive enough to serve as complete SQL documentation for specific topics. Always use backticks around SQL code in tables and ensure maximum coverage and practical enterprise value."
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
    .from('sql_syntax')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', syntaxId);

  if (updateError) {
    throw new Error(`Failed to save comprehensive SQL syntax reference for topic ${syntaxId}`);
  }

  // Calculate SQL-specific comprehensive metrics
  const syntaxCount = (generatedTheory.match(/`[^`]+`/g) || []).length;
  const tableEntries = (generatedTheory.match(/\|.*?\|.*?\|/g) || []).length - 1;
  const databaseEngines = (generatedTheory.match(/MySQL|PostgreSQL|Oracle|SQL Server|SQLite|MariaDB|DB2|Snowflake|BigQuery|Redshift/gi) || []).length;
  const queryCount = (generatedTheory.match(/SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|MERGE|UPSERT/gi) || []).length;
  const functionCount = (generatedTheory.match(/\w+\(/g) || []).length;

  return {
    success: true,
    syntaxId,
    syntaxName: syntax.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    syntaxCount,
    tableEntries,
    databaseEngines,
    queryCount,
    functionCount,
    comprehensiveScore: Math.round((syntaxCount + tableEntries + databaseEngines + queryCount) / 20),
    message: 'Ultra-comprehensive SQL syntax reference generated successfully'
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
      const result = await processSqlSyntax(syntaxId);
      return NextResponse.json({
        ...result,
        message: 'Ultra-comprehensive SQL syntax reference regenerated successfully'
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
        .update({ sql_syntax: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'SQL syntax counter reset to 0 - ready for comprehensive generation'
      });
    }
    
    if (resetTheory && syntaxId) {
      const { error: resetError } = await supabase
        .from('sql_syntax')
        .update({ theory: null })
        .eq('id', syntaxId);
      
      if (resetError) {
        throw new Error(`Failed to reset theory for SQL syntax topic ${syntaxId}`);
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