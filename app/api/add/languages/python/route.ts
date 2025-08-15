import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Supabase client configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Groq API configuration
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_API_KEY = process.env.PYTHON_LANG_THEORY_GROQ_API_KEY;

interface PythonTheoryData {
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

    // Get current question number from questions_done table (python_lang_theory column)
    const { data: questionDoneData, error: questionDoneError } = await supabase
      .from('questions_done')
      .select('python_lang_theory')
      .eq('id', 1)
      .single();

    if (questionDoneError || !questionDoneData) {
      console.error('Questions done error:', questionDoneError);
      return NextResponse.json({ error: 'Questions done record not found' }, { status: 404 });
    }

    // Get the next question to process (current + 1)
    const nextQuestionId = questionDoneData.python_lang_theory + 1;

    // Fetch the next concept from python_lang_theory table
    const { data: conceptData, error: conceptError } = await supabase
      .from('python_lang_theory')
      .select('id, concept')
      .eq('id', nextQuestionId)
      .single();

    if (conceptError || !conceptData) {
      console.error('Concept error:', conceptError);
      return NextResponse.json({ error: `Concept with ID ${nextQuestionId} not found` }, { status: 404 });
    }

    // Create enhanced prompt for comprehensive theory generation with strict code block formatting
    const groqPrompt = `Generate a comprehensive, educational explanation for the Python programming concept. Create structured content that's easy to understand with real-world analogies. Respond with valid JSON only.

Concept: ${conceptData.concept}

CRITICAL FORMATTING RULES FOR CODE BLOCKS:
- ALWAYS use exactly "$#" to start a code block (no spaces after)
- ALWAYS use exactly " #$" to end a code block (ONE space before #$)
- Format: $#\\ncode here\\n #$
- Never use $# python or $#python - just $# then newline
- Always add a space before the closing #$
- Each code block must be on separate lines with proper spacing

Example of correct code formatting:
$#
# Your Python code here
def example_function():
    pass
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
  "theory": "# ${conceptData.concept}\\n\\n## 📋 Quick Overview\\n\\n${conceptData.concept} is a fundamental concept in Python programming that [provide brief, clear definition]. Think of it like [provide simple analogy].\\n\\n### Key Points\\n\\n| Aspect | Description |\\n|--------|-------------|\\n| Purpose | What it does and why it's important |\\n| Usage | When and where to use it |\\n| Benefits | Main advantages |\\n| Complexity | Beginner/Intermediate/Advanced |\\n\\n---\\n\\n## 🎯 Core Concepts\\n\\n### What is ${conceptData.concept}?\\n\\n[Provide detailed explanation with analogies]\\n\\n### Real-World Analogy\\n\\n🏠 **Think of ${conceptData.concept} like [relatable analogy]:**\\n\\n- [Analogy point 1]\\n- [Analogy point 2]\\n- [Analogy point 3]\\n\\n### Key Characteristics\\n\\n| Feature | Explanation | Example |\\n|---------|-------------|---------|\\n| **Feature 1** | Detailed explanation | Brief example |\\n| **Feature 2** | Detailed explanation | Brief example |\\n| **Feature 3** | Detailed explanation | Brief example |\\n\\n---\\n\\n## 💻 Syntax and Implementation\\n\\n### Basic Syntax\\n\\n$#\\n# Basic implementation with detailed comments\\ndef main():\\n    # Step-by-step explanation\\n    print(\\"Understanding ${conceptData.concept}\\")\\n\\nif __name__ == \\"__main__\\":\\n    main()\\n #$\\n\\n**Step-by-Step Explanation:**\\n\\n1. **Line 1:** [Explain what this line does]\\n2. **Line 2:** [Explain what this line does]\\n3. **Line 3:** [Explain what this line does]\\n\\n### Advanced Implementation\\n\\n$#\\nclass AdvancedExample:\\n    \\"\\"\\"More complex example showing advanced usage\\"\\"\\"\\n    \\n    def demonstrate_advanced(self):\\n        # Advanced implementation with best practices\\n        pass\\n #$\\n\\n---\\n\\n## 🛠️ Practical Examples\\n\\n### Example 1: Step-by-Step Basic Implementation\\n\\n**Scenario:** [Describe a real-world scenario]\\n\\n$#\\n# Step 1: [Explain what we're doing]\\n\\n# Step 2: [Explain the next step]\\n\\n# Step 3: [Explain the final step]\\n\\ndef practical_example():\\n    pass\\n\\nif __name__ == \\"__main__\\":\\n    practical_example()\\n #$\\n\\n**Expected Output:**\\n\\n$#\\n[Expected output here]\\n #$\\n\\n### Example 2: Real-World Application\\n\\n**Use Case:** [Describe a practical use case]\\n\\n$#\\nclass RealWorldExample:\\n    \\"\\"\\"Practical implementation that solves real problems\\"\\"\\"\\n    \\n    def solve_real_problem(self):\\n        # Implementation with detailed comments\\n        # Each line should be clearly explained\\n        pass\\n #$\\n\\n---\\n\\n## ✅ Benefits and Advantages\\n\\n| Benefit | Description | Impact |\\n|---------|-------------|--------|\\n| **🚀 Performance** | How it improves performance | High/Medium/Low |\\n| **🔧 Maintainability** | Makes code easier to maintain | High/Medium/Low |\\n| **📖 Readability** | Improves code clarity | High/Medium/Low |\\n| **🛡️ Safety** | Prevents common errors | High/Medium/Low |\\n\\n---\\n\\n## 🎯 Best Practices\\n\\n### ✅ Do's\\n\\n| Practice | Why It's Good | Example |\\n|----------|---------------|---------|\\n| **Follow PEP 8** | Improves readability | Use snake_case for functions |\\n| **Add proper documentation** | Helps other developers | Write clear docstrings |\\n| **Handle exceptions** | Makes code robust | Use try-except blocks |\\n\\n### ❌ Don'ts\\n\\n| Anti-Pattern | Why It's Bad | Better Alternative |\\n|--------------|--------------|-------------------|\\n| **Poor naming** | Confuses other developers | Use descriptive names |\\n| **No error handling** | Causes runtime failures | Always handle exceptions |\\n| **Code duplication** | Hard to maintain | Extract common functions |\\n\\n---\\n\\n## ⚠️ Common Pitfalls and Solutions\\n\\n### Pitfall 1: [Common Mistake]\\n\\n**❌ Problem:** [Describe the issue]\\n\\n**✅ Solution:** [How to fix it]\\n\\n$#\\n# Wrong way - avoid this\\n# [Show incorrect implementation]\\n\\n# Correct way - do this instead\\n# [Show correct implementation]\\n #$\\n\\n### Pitfall 2: [Another Common Issue]\\n\\n**❌ Problem:** [Describe another issue]\\n\\n**✅ Solution:** [Prevention strategy]\\n\\n$#\\n# Better approach\\n# [Show improved implementation]\\n #$\\n\\n---\\n\\n## 🔗 Related Concepts\\n\\n| Related Concept | Relationship | When to Use Together |\\n|----------------|--------------|---------------------|\\n| **Concept A** | How they relate | Specific scenarios |\\n| **Concept B** | Integration points | Use cases |\\n| **Concept C** | Dependencies | When both are needed |\\n\\n---\\n\\n## 🎓 Interview Preparation\\n\\n### Common Questions and Answers\\n\\n#### Q1: What is ${conceptData.concept} and why is it important?\\n\\n**Answer:** [Comprehensive answer with examples]\\n\\n#### Q2: When would you use ${conceptData.concept} in a real project?\\n\\n**Answer:** [Practical scenarios and use cases]\\n\\n#### Q3: What are the main advantages and disadvantages?\\n\\n**Answer:**\\n\\n| Advantages | Disadvantages |\\n|------------|---------------|\\n| [Advantage 1] | [Disadvantage 1] |\\n| [Advantage 2] | [Disadvantage 2] |\\n| [Advantage 3] | [Disadvantage 3] |\\n\\n#### Q4: How does ${conceptData.concept} compare to similar concepts?\\n\\n**Answer:** [Detailed comparison with examples]\\n\\n---\\n\\n## 📊 Performance Considerations\\n\\n### Time and Space Complexity\\n\\n| Operation | Time Complexity | Space Complexity | Notes |\\n|-----------|----------------|------------------|-------|\\n| Basic Operation | O(1) | O(1) | Constant time |\\n| Complex Operation | O(n) | O(n) | Linear growth |\\n\\n### Memory Usage Tips\\n\\n- **Tip 1:** [Memory optimization advice]\\n- **Tip 2:** [Performance improvement suggestion]\\n- **Tip 3:** [Best practice for efficiency]\\n\\n---\\n\\n## 🎯 Summary and Key Takeaways\\n\\n### 📌 Essential Points\\n\\n| Key Point | Description |\\n|-----------|-------------|\\n| **Core Concept** | [Main understanding] |\\n| **Primary Use** | [When to use it] |\\n| **Best Practice** | [Most important rule] |\\n\\n### 🚀 Next Steps\\n\\n1. **Practice:** Try the provided examples in your Python environment\\n2. **Experiment:** Modify the code to see different behaviors\\n3. **Apply:** Use this concept in a small project\\n4. **Learn More:** Explore related concepts and advanced topics\\n\\n---\\n\\n### 💡 Pro Tips\\n\\n- **Tip 1:** [Advanced insight or trick]\\n- **Tip 2:** [Practical advice for real projects]\\n- **Tip 3:** [Common optimization or best practice]\\n\\n---\\n\\n*📚 This comprehensive guide covers all aspects of ${conceptData.concept} in Python programming. Practice with the examples and apply these concepts in your projects to master this important topic!*"
}

REMEMBER: 
- Use exactly "$#" to start code blocks (no language specification)
- Use exactly " #$" to end code blocks (with ONE space before #$)
- Add proper spacing between sections
- Make explanations clear and beginner-friendly
- Include practical examples and analogies
- Follow Python conventions (snake_case, PEP 8, docstrings)`;

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
            content: 'You are an expert Python programming instructor and technical writer. Create comprehensive, educational content with clear explanations, practical examples, structured tables, real-world analogies, and proper formatting. CRITICAL: Always use "$#" to start code blocks and " #$" (with one space before) to end code blocks. Never add language specifiers after $#. Always respond with valid JSON format. Use tables to organize information when it makes the content clearer. Include step-by-step explanations and relatable analogies to make complex concepts easy to understand. Follow Python best practices including PEP 8, snake_case naming, and proper docstring conventions.'
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
    
    console.log('Code block validation:');
    console.log('Start markers ($#):', (processedTheory.match(/\$#/g) || []).length);
    console.log('End markers ( #$):', (processedTheory.match(/ #\$/g) || []).length);

    // Update the python_lang_theory table with the processed theory
    const { error: updateError } = await supabase
      .from('python_lang_theory')
      .update({
        theory: processedTheory
      })
      .eq('id', nextQuestionId);

    if (updateError) {
      console.error('Update error:', updateError);
      throw new Error('Failed to update theory in database');
    }

    // Increment the questions_done counter
    const { error: incrementError } = await supabase
      .from('questions_done')
      .update({
        python_lang_theory: nextQuestionId
      })
      .eq('id', 1);

    if (incrementError) {
      console.error('Increment error:', incrementError);
      throw new Error('Failed to increment question counter');
    }

    // Create response with enhanced information
    return NextResponse.json({
      success: true,
      message: 'Enhanced Python theory generated and saved successfully',
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
    error: 'Method not allowed. Use GET to generate Python theory content.' 
  }, { status: 405 });
}