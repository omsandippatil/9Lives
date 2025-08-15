import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.SQL_LANG_THEORY_GROQ_API_KEY;

interface SqlTheoryData {
  id: number;
  concept: string;
  theory?: string;
}

interface GroqTheoryResponse {
  theory: string;
}

export async function GET(request: NextRequest) {
  try {
    // Check API key
    const apiKey = request.nextUrl.searchParams.get('api_key');
    if (!apiKey || apiKey !== process.env.API_KEY) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Get current question number from questions_done table (sql_lang_theory column)
    const { data: questionDoneData, error: questionDoneError } = await supabase
      .from('questions_done')
      .select('sql_lang_theory')
      .eq('id', 1)
      .single();

    if (questionDoneError || !questionDoneData) {
      console.error('Questions done error:', questionDoneError);
      return NextResponse.json({ error: 'Questions done record not found' }, { status: 404 });
    }

    // Get the next question to process (current + 1)
    const nextQuestionId = questionDoneData.sql_lang_theory + 1;

    // Fetch the next concept from sql_lang_theory table
    const { data: conceptData, error: conceptError } = await supabase
      .from('sql_lang_theory')
      .select('id, concept')
      .eq('id', nextQuestionId)
      .single();

    if (conceptError || !conceptData) {
      console.error('Concept error:', conceptError);
      return NextResponse.json({ error: `Concept with ID ${nextQuestionId} not found` }, { status: 404 });
    }

    // Create enhanced prompt for comprehensive theory generation with strict code block formatting
    const groqPrompt = `Generate a comprehensive, educational explanation for the SQL database concept. Create structured content that's easy to understand with real-world analogies. Respond with valid JSON only.

Concept: ${conceptData.concept}

CRITICAL FORMATTING RULES FOR SQL CODE BLOCKS:
- ALWAYS use exactly "$#" to start a code block (no spaces after)
- ALWAYS use exactly " #$" to end a code block (ONE space before #$)
- Format: $#\\nSELECT * FROM table;\\n #$
- Never use $# sql or $#sql - just $# then newline
- Always add a space before the closing #$
- Each code block must be on separate lines with proper spacing

Example of correct SQL code formatting:
$#
SELECT column1, column2
FROM table_name
WHERE condition = 'value';
 #$

IMPORTANT TEXT FORMATTING RULES:
- Use \\n for line breaks in JSON
- Add proper spacing around headers and sections
- Use tables for structured comparisons
- Include practical examples with step-by-step explanations
- Use analogies to make complex concepts relatable
- Add proper markdown formatting for headers, lists, and emphasis

Create content using this exact JSON template:
{
  "theory": "# ${conceptData.concept}\\n\\n## 📋 Quick Overview\\n\\n${conceptData.concept} is a fundamental concept in SQL database management that [provide brief, clear definition]. Think of it like [provide simple analogy].\\n\\n### Key Points\\n\\n| Aspect | Description |\\n|--------|-------------|\\n| Purpose | What it does and why it's important |\\n| Usage | When and where to use it |\\n| Benefits | Main advantages |\\n| Complexity | Beginner/Intermediate/Advanced |\\n\\n---\\n\\n## 🎯 Core Concepts\\n\\n### What is ${conceptData.concept}?\\n\\n[Provide detailed explanation with analogies]\\n\\n### Real-World Analogy\\n\\n🗃️ **Think of ${conceptData.concept} like [relatable analogy]:**\\n\\n- [Analogy point 1]\\n- [Analogy point 2]\\n- [Analogy point 3]\\n\\n### Key Characteristics\\n\\n| Feature | Explanation | Example |\\n|---------|-------------|---------|\\n| **Feature 1** | Detailed explanation | Brief example |\\n| **Feature 2** | Detailed explanation | Brief example |\\n| **Feature 3** | Detailed explanation | Brief example |\\n\\n---\\n\\n## 💻 SQL Syntax and Implementation\\n\\n### Basic Syntax\\n\\n$#\\n-- Basic ${conceptData.concept} implementation\\nSELECT column_name\\nFROM table_name\\nWHERE condition = 'value';\\n #$\\n\\n**Step-by-Step Explanation:**\\n\\n1. **SELECT clause:** [Explain what this clause does]\\n2. **FROM clause:** [Explain what this clause does]\\n3. **WHERE clause:** [Explain what this clause does]\\n\\n### Advanced Implementation\\n\\n$#\\n-- More complex example showing advanced usage\\nSELECT t1.column1, t2.column2\\nFROM table1 t1\\nJOIN table2 t2 ON t1.id = t2.foreign_id\\nWHERE t1.status = 'active'\\nORDER BY t1.created_date DESC;\\n #$\\n\\n---\\n\\n## 🛠️ Practical Examples\\n\\n### Example 1: Step-by-Step Basic Implementation\\n\\n**Scenario:** [Describe a real-world database scenario]\\n\\n$#\\n-- Step 1: [Explain what we're doing]\\nCREATE TABLE example_table (\\n    id INT PRIMARY KEY,\\n    name VARCHAR(100),\\n    created_date DATE\\n);\\n\\n-- Step 2: [Explain the next step]\\nINSERT INTO example_table (id, name, created_date)\\nVALUES (1, 'Sample Data', CURRENT_DATE);\\n\\n-- Step 3: [Explain the final step]\\nSELECT * FROM example_table\\nWHERE created_date = CURRENT_DATE;\\n #$\\n\\n**Expected Output:**\\n\\n$#\\nid | name        | created_date\\n---|-------------|-------------\\n1  | Sample Data | 2024-01-15\\n #$\\n\\n### Example 2: Real-World Application\\n\\n**Use Case:** [Describe a practical database use case]\\n\\n$#\\n-- Practical implementation that solves real database problems\\nSELECT \\n    customer_name,\\n    COUNT(order_id) as total_orders,\\n    SUM(order_amount) as total_spent\\nFROM customers c\\nJOIN orders o ON c.customer_id = o.customer_id\\nWHERE order_date >= DATE_SUB(CURRENT_DATE, INTERVAL 30 DAY)\\nGROUP BY customer_name\\nHAVING total_orders > 1\\nORDER BY total_spent DESC;\\n #$\\n\\n---\\n\\n## ✅ Benefits and Advantages\\n\\n| Benefit | Description | Impact |\\n|---------|-------------|--------|\\n| **🚀 Performance** | How it improves query performance | High/Medium/Low |\\n| **🔧 Maintainability** | Makes database easier to maintain | High/Medium/Low |\\n| **📖 Readability** | Improves query clarity | High/Medium/Low |\\n| **🛡️ Data Integrity** | Prevents data inconsistencies | High/Medium/Low |\\n\\n---\\n\\n## 🎯 Best Practices\\n\\n### ✅ Do's\\n\\n| Practice | Why It's Good | Example |\\n|----------|---------------|---------|\\n| **Use meaningful column names** | Improves readability | Use 'customer_name' not 'cn' |\\n| **Add proper indexes** | Speeds up queries | CREATE INDEX idx_customer_email |\\n| **Use transactions** | Ensures data consistency | BEGIN; INSERT...; COMMIT; |\\n\\n### ❌ Don'ts\\n\\n| Anti-Pattern | Why It's Bad | Better Alternative |\\n|--------------|--------------|-------------------|\\n| **SELECT *** | Inefficient and unclear | SELECT specific columns |\\n| **No WHERE clauses** | Returns unnecessary data | Always filter when possible |\\n| **Hardcoded values** | Hard to maintain | Use parameters or variables |\\n\\n---\\n\\n## ⚠️ Common Pitfalls and Solutions\\n\\n### Pitfall 1: [Common SQL Mistake]\\n\\n**❌ Problem:** [Describe the issue]\\n\\n**✅ Solution:** [How to fix it]\\n\\n$#\\n-- Wrong way - avoid this\\nSELECT *\\nFROM large_table\\nWHERE UPPER(column_name) = 'VALUE';\\n\\n-- Correct way - do this instead\\nSELECT specific_columns\\nFROM large_table\\nWHERE column_name = 'value'\\nAND index_column IS NOT NULL;\\n #$\\n\\n### Pitfall 2: [Another Common Issue]\\n\\n**❌ Problem:** [Describe another issue]\\n\\n**✅ Solution:** [Prevention strategy]\\n\\n$#\\n-- Better approach\\nSELECT column1, column2\\nFROM table1\\nWHERE EXISTS (\\n    SELECT 1 FROM table2 \\n    WHERE table2.foreign_key = table1.id\\n);\\n #$\\n\\n---\\n\\n## 🔗 Related Concepts\\n\\n| Related Concept | Relationship | When to Use Together |\\n|----------------|--------------|---------------------|\\n| **JOINs** | How they work together | When combining tables |\\n| **Indexes** | Performance optimization | For query speed |\\n| **Transactions** | Data consistency | For data integrity |\\n\\n---\\n\\n## 🎓 Interview Preparation\\n\\n### Common Questions and Answers\\n\\n#### Q1: What is ${conceptData.concept} and why is it important in SQL?\\n\\n**Answer:** [Comprehensive answer with SQL examples]\\n\\n#### Q2: When would you use ${conceptData.concept} in a real database project?\\n\\n**Answer:** [Practical scenarios and use cases]\\n\\n#### Q3: What are the main advantages and disadvantages?\\n\\n**Answer:**\\n\\n| Advantages | Disadvantages |\\n|------------|---------------|\\n| [Advantage 1] | [Disadvantage 1] |\\n| [Advantage 2] | [Disadvantage 2] |\\n| [Advantage 3] | [Disadvantage 3] |\\n\\n#### Q4: How does ${conceptData.concept} compare to similar SQL concepts?\\n\\n**Answer:** [Detailed comparison with examples]\\n\\n---\\n\\n## 📊 Performance Considerations\\n\\n### Time and Space Complexity\\n\\n| Operation | Time Complexity | Space Complexity | Notes |\\n|-----------|----------------|------------------|-------|\\n| Basic Query | O(log n) | O(1) | With proper indexing |\\n| Complex Join | O(n * m) | O(n + m) | Depends on join type |\\n\\n### Performance Optimization Tips\\n\\n- **Tip 1:** [Database optimization advice]\\n- **Tip 2:** [Query performance improvement]\\n- **Tip 3:** [Best practice for efficiency]\\n\\n---\\n\\n## 🎯 Summary and Key Takeaways\\n\\n### 📌 Essential Points\\n\\n| Key Point | Description |\\n|-----------|-------------|\\n| **Core Concept** | [Main understanding] |\\n| **Primary Use** | [When to use it] |\\n| **Best Practice** | [Most important rule] |\\n\\n### 🚀 Next Steps\\n\\n1. **Practice:** Try the provided SQL examples in your database\\n2. **Experiment:** Modify the queries to see different behaviors\\n3. **Apply:** Use this concept in a small database project\\n4. **Learn More:** Explore related SQL concepts and advanced topics\\n\\n---\\n\\n### 💡 Pro Tips\\n\\n- **Tip 1:** [Advanced SQL insight or trick]\\n- **Tip 2:** [Practical advice for real database projects]\\n- **Tip 3:** [Common optimization or best practice]\\n\\n---\\n\\n*🗃️ This comprehensive guide covers all aspects of ${conceptData.concept} in SQL database management. Practice with the examples and apply these concepts in your database projects to master this important topic!*"
}

REMEMBER: 
- Use exactly "$#" to start code blocks (no language specification)
- Use exactly " #$" to end code blocks (with ONE space before #$)
- Add proper spacing between sections
- Make explanations clear and beginner-friendly
- Include practical SQL examples and database analogies
- Focus on database concepts, queries, and data management`;

    // Call Groq API with updated instructions
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'You are an expert SQL database instructor and technical writer. Create comprehensive, educational content with clear explanations, practical SQL examples, structured tables, real-world database analogies, and proper formatting. CRITICAL: Always use "$#" to start code blocks and " #$" (with one space before) to end code blocks. Never add language specifiers after $#. Always respond with valid JSON format. Use tables to organize information when it makes the content clearer. Include step-by-step SQL explanations and relatable database analogies to make complex concepts easy to understand. Focus on practical database scenarios and real-world applications.'
          },
          {
            role: 'user',
            content: groqPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 12000,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error response:', errorText);
      throw new Error(`Groq API error: ${groqResponse.status} ${groqResponse.statusText} - ${errorText}`);
    }

    const groqData = await groqResponse.json();
    const aiContent = groqData.choices[0]?.message?.content;

    if (!aiContent) {
      throw new Error('No response from Groq API');
    }

    // Enhanced JSON parsing with better error handling
    let theoryResponse: GroqTheoryResponse;
    try {
      console.log('Raw AI Response length:', aiContent.length);
      
      // Clean and extract JSON
      let jsonString = aiContent.trim();
      
      // Remove markdown code blocks if present
      jsonString = jsonString.replace(/```json\s*/g, '').replace(/```\s*/g, '');
      
      // Find JSON object boundaries more precisely
      let jsonStart = jsonString.indexOf('{');
      let jsonEnd = -1;
      
      // Find matching closing brace
      if (jsonStart !== -1) {
        let braceCount = 0;
        for (let i = jsonStart; i < jsonString.length; i++) {
          if (jsonString[i] === '{') braceCount++;
          if (jsonString[i] === '}') braceCount--;
          if (braceCount === 0) {
            jsonEnd = i + 1;
            break;
          }
        }
      }
      
      if (jsonStart !== -1 && jsonEnd > jsonStart) {
        jsonString = jsonString.substring(jsonStart, jsonEnd);
      }
      
      console.log('Cleaned JSON length:', jsonString.length);
      
      theoryResponse = JSON.parse(jsonString);
      
      // Validate required fields
      if (!theoryResponse.theory) {
        throw new Error('Missing theory field in AI response');
      }
      
    } catch (parseError) {
      console.error('Failed to parse Groq response:', parseError);
      console.error('Response preview:', aiContent.substring(0, 1000));
      
      // Fallback parsing attempt
      try {
        const fallbackMatch = aiContent.match(/\{[\s\S]*\}/);
        if (fallbackMatch) {
          theoryResponse = JSON.parse(fallbackMatch[0]);
        } else {
          throw new Error('No valid JSON structure found in response');
        }
      } catch (fallbackError) {
        throw new Error(`Unable to parse AI response as JSON. Error: ${parseError instanceof Error ? parseError.message : 'Unknown parsing error'}`);
      }
    }

    // Post-process the theory content to ensure proper code block formatting
    let processedTheory = theoryResponse.theory;
    
    // Fix any incorrect code block endings - ensure there's always a space before #$
    processedTheory = processedTheory.replace(/([^\s])#\$/g, '$1 #$');
    
    // Ensure code blocks start correctly (remove any language specifications)
    processedTheory = processedTheory.replace(/\$#\s*[a-z]*\s*\n/g, '$#\n');
    
    // Add extra spacing around code blocks for better readability
    processedTheory = processedTheory.replace(/\$#\n/g, '\n$#\n');
    processedTheory = processedTheory.replace(/\n #\$/g, '\n #$\n\n');
    
    console.log('SQL code block validation:');
    console.log('Start markers ($#):', (processedTheory.match(/\$#/g) || []).length);
    console.log('End markers ( #$):', (processedTheory.match(/ #\$/g) || []).length);

    // Update the sql_lang_theory table with the processed theory
    const { error: updateError } = await supabase
      .from('sql_lang_theory')
      .update({
        theory: processedTheory
      })
      .eq('id', nextQuestionId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update SQL theory in database');
    }

    // Increment the questions_done counter
    const { error: incrementError } = await supabase
      .from('questions_done')
      .update({
        sql_lang_theory: nextQuestionId
      })
      .eq('id', 1);

    if (incrementError) {
      console.error('Increment error:', incrementError);
      throw new Error('Failed to increment SQL question counter');
    }

    // Create response with enhanced information
    return NextResponse.json({
      success: true,
      message: 'Enhanced SQL theory generated and saved successfully',
      data: {
        conceptId: nextQuestionId,
        concept: conceptData.concept,
        theoryLength: processedTheory.length,
        theoryPreview: processedTheory.substring(0, 300) + '...',
        hasCodeBlocks: processedTheory.includes('$#'),
        codeBlockCount: {
          start: (processedTheory.match(/\$#/g) || []).length,
          end: (processedTheory.match(/ #\$/g) || []).length
        },
        hasTables: processedTheory.includes('|'),
        timestamp: new Date().toISOString()
      },
      fullTheory: processedTheory
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  return NextResponse.json({ 
    error: 'Method not allowed. Use GET to generate SQL theory content.' 
  }, { status: 405 });
}