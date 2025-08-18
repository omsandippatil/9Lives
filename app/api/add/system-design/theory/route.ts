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
  apiKey: process.env.TECHTOPIC_GROQ_API_KEY!,
});

interface SystemDesign {
  id: number;
  name: string;
  theory?: string;
  created_at?: string;
}

interface QuestionsCounter {
  system_design: number;
}

// Enhanced prompt for generating comprehensive system design theories
const createSystemDesignPrompt = (designName: string) => `
You are a distinguished senior systems architect, distributed systems expert, and software engineering leader with decades of experience designing large-scale systems at top technology companies. You have deep expertise across all areas of system design - from microservices architectures to distributed databases, from load balancing to caching strategies, from scalability patterns to reliability engineering. You will generate a COMPREHENSIVE, DETAILED, and ARCHITECTURALLY RIGOROUS explanation about the system design topic provided.

**System Design Topic**: "${designName}"

## RESPONSE FORMAT REQUIREMENTS:

Your response MUST be a comprehensive system design deep-dive that covers EVERY aspect of the system architecture. You have complete autonomy to decide the headings and structure based on what makes most sense for this specific system design. The response should be formatted as a detailed architectural document that could serve as both a learning resource and implementation guide.

## MANDATORY CONTENT AREAS TO COVER:

### 📚 PROBLEM DEFINITION & CONTEXT
- **Problem Statement (Concise)**: Single-sentence description of the core problem being solved. — **(Essential)** (forces clarity)
- **System Requirements**: What specific business and technical requirements need to be addressed? — **(Essential)** (functional & non-functional; acceptance criteria)
- **What Problem Is Solved**: Explicit mapping from the problem statement → measurable outcomes (e.g., reduce latency from X→Y, support N users). — **(Essential)** (ties design to value)
- **How It Solves the Problem (Solution Summary)**: Short explanation of the mechanism/approach used to solve the problem (one-paragraph). — **(Essential)** (high-level cause → effect)
- **What's Unique / Differentiators**: Features, design choices, or constraints that make this solution distinct from alternatives. — **(Essential / Concise)** (product + architecture differentiators)
- **Scale Expectations**: Expected user base, data volume, request patterns, and growth projections — **(Essential)** (provides sizing context)
- **Business Context**: What business problem this system solves and why it matters — **(Essential)** (motivates tradeoffs)
- **User Personas & Journeys**: Primary users, their goals, and key interaction flows that drive requirements — **(Useful / Practical)** (informs UX & SLA)
- **Assumptions & Constraints**: Explicit assumptions (traffic, budgets, regulatory) and hard constraints — **(Essential)** (prevents hidden surprises)
- **Edge Cases & Failure Modes**: Known edge scenarios and how system should behave — **(Essential)** (include priority & impact)
- **Legacy Constraints**: Existing systems, technical debt, or migration considerations — **(Useful / Optional)**
- **Success Metrics**: How system performance and business success will be measured (SLOs, KPIs) — **(Essential)** (define what “good” means)
- **Vocabulary: Key Terms & Concepts.** — **(Essential)** (short glossary + important acronyms)

### 🏗️ HIGH-LEVEL ARCHITECTURE
- **System Overview**: Bird's-eye view of the entire system and its major components — **(Essential)**
- **Solution Pattern (Why this pattern?)**: Short rationale linking chosen architecture (event-driven, CQRS, stream processing, etc.) to the problem and uniqueness. — **(Essential)**
- **Service Boundaries**: How the system is decomposed into services/modules — **(Essential)**
- **Data Flow Architecture**: End-to-end information flows and touchpoints — **(Essential)** (sequence/flow diagram recommended)
- **Integration Points**: External systems, third-party APIs, and critical interfaces — **(Essential)**
- **Deployment Architecture**: Logical deployment topology (zones, regions, clusters) — **(Essential / Brief)**

### 🔧 CORE COMPONENTS & SERVICES
- **Service Catalog**: Each major service/component, responsibility, and SLAs — **(Essential)**
- **Component Interactions**: Sync/async interactions, protocols, and contracts — **(Essential)**
- **How Each Component Solves Part of the Problem**: Map components → specific requirement(s) they address. — **(Essential)** (traceability)
- **API Design**: Public/internal APIs (REST/GraphQL/gRPC), versioning, payloads — **(Essential)**
- **Service Dependencies**: Dependency graph, critical paths, and chokepoints — **(Essential / Focused)**
- **Shared Libraries & Utilities**: Common tooling, middlewares, auth libraries — **(Useful)**

### 💾 DATA ARCHITECTURE
- **Data Models**: Core entities, relationships, and schema overview — **(Essential)**
- **Database Strategy**: RDB vs NoSQL vs multi-model choices; sharding/partitioning — **(Essential)**
- **Data Storage Patterns**: OLTP/OLAP/Cold vs Hot storage, object stores, logs — **(Essential)**
- **Data Consistency**: Chosen consistency model, transaction boundaries, compensating actions — **(Essential)**
- **Data Migration & Versioning**: Schema evolution, backfills, rollbacks — **(Useful / Practical)**

### ⚡ SCALABILITY & PERFORMANCE
- **Horizontal Scaling**: Sharding, stateless services, autoscaling patterns — **(Essential)**
- **Vertical Scaling**: Resource sizing, when to scale up vs out — **(Useful)** 
- **Load Distribution**: Load balancers, routing, ingress patterns — **(Essential)**
- **Caching Strategy**: Cache tiers, invalidation, read-through/write-through patterns — **(Essential)**
- **Performance Targets (Numbers)**: RPS, p99 latency targets, throughput goals mapped to requirements — **(Essential)** (concrete SLAs)
- **Performance Bottlenecks**: Identify likely hotspots and mitigation strategies — **(Essential / Include numbers if available)**

### 🛡️ RELIABILITY & RESILIENCE
- **Fault Tolerance**: Redundancy, graceful degradation, retry/backoff policies — **(Essential)**
- **Failure Modes & Mitigations**: For each critical failure mode, list mitigation and recovery steps — **(Essential)** (connects to edge cases)
- **Disaster Recovery**: Backup/restore, RTO/RPO, cross-region failover — **(Essential)**
- **Health Monitoring**: Readiness/liveness checks, heartbeat, self-heal patterns — **(Essential)**
- **Graceful Degradation**: Reduced functionality modes, feature flags — **(Essential / Practical examples)**
- **SLA / SLO Design**: SLO definition, error budgets, escalation — **(Useful / Numbers if known)**

### 🔒 SECURITY ARCHITECTURE
- **Authentication & Authorization**: Identity model, token flows, RBAC/ABAC — **(Essential)**
- **Threat Model & Attack Surface**: Top threats, threat actor capabilities, and mitigations — **(Essential)** (keeps design focused on real risks)
- **Data Security**: Encryption at rest/in transit, key management, data masking — **(Essential)**
- **Network & API Security**: Segmentation, WAF, rate limits, input validation — **(Essential)**
- **Compliance & Audit**: Logging for audits, data residency, regulatory requirements — **(Useful / If applicable)**

### 🚀 DEPLOYMENT & OPERATIONS
- **Deployment Strategy**: CI/CD, deployment patterns (blue/green, canary, rolling) — **(Essential)**
- **Proof-of-Concept / Validation Plan**: Small-scale tests to validate the unique differentiator or bottleneck assumptions. — **(Essential / Early validation)**
- **Infrastructure as Code**: Declarative infra, drift detection, modular templates — **(Useful)**
- **Container & Orchestration**: Containerization, orchestration strategy (K8s, serverless) — **(Essential / If applicable)**
- **Operational Runbooks**: Incident playbooks, runbooks, on-call rotation — **(Essential / Highlights)**

### 📊 MONITORING & OBSERVABILITY
- **Logging Strategy**: Structured logs, central aggregation, retention policy — **(Essential)**
- **Metrics Collection**: Operational & business metrics, cardinality control — **(Essential)**
- **KPIs tied to Problem Solved**: Direct metrics that prove the problem is being solved (e.g., error rate down X%, conversion up Y). — **(Essential)** (measurable outcome)
- **Distributed Tracing**: End-to-end traces, sampling strategy — **(Essential / If microservices)**
- **Alerting & Incident Response**: Alert thresholds, escalation, postmortems — **(Essential)**

### 🔄 INTEGRATION PATTERNS
- **Message Queues**: When to use async queues, delivery guarantees, DLQ patterns — **(Essential / If applicable)**
- **Event-Driven Patterns**: Event sourcing vs event streaming tradeoffs — **(Essential / If applicable)**
- **API Gateway / Edge**: Edge patterns, routing, auth, rate limiting — **(Essential / If applicable)**
- **ETL / Data Pipelines**: Streaming vs batch, idempotency, schema registry — **(Useful / If data-heavy)**

### 🎯 DESIGN TRADEOFFS & DECISIONS
- **Tradeoff Map**: List top 5 design tradeoffs (performance vs cost, consistency vs availability) and chosen side with rationale — **(Essential)**
- **CAP Theorem Considerations**: Chosen consistency/availability tradeoffs — **(Essential)**
- **Technology Choices**: Rationale for DBs, messaging, languages, frameworks — **(Essential / Brief)**
- **Cost vs Value**: Cost drivers vs the problem’s value to the business — **(Useful / If budget-constrained)**

### 📈 GROWTH & EVOLUTION
- **Scalability Roadmap**: Planned scaling stages and triggers — **(Useful)**
- **Migration Strategy**: Phased migration, strangler patterns — **(Useful / Optional)**
- **Extensibility**: Plugin points, feature toggle design for new features — **(Useful)**
- **Validation & Metrics Over Time**: When and how to re-evaluate the uniqueness claims and performance (A/B, canary metrics) — **(Useful / Important for product-market fit)**

### 💡 IMPLEMENTATION GUIDANCE
- **Development Best Practices**: Code standards, testing pyramid, CI policies — **(Essential)**
- **Common Pitfalls**: Anti-patterns, operational surprises to avoid — **(Essential)**
- **Success Patterns**: Proven blueprints, accelerators, and fast wins — **(Essential)**
- **Team Structure & Ownership**: Recommended org alignment and handoffs — **(Useful / Brief)**
- **Go-to-Market / Validation Notes**: Quick checks to prove customer value for unique features (pilot criteria). — **(Useful / Optional)**

---
**Usage guidance:**  
1. Start with **Problem Statement → What’s Solved → How it Solves it → What's Unique** (these are the narrative spine).  
2. Fill **Essential** items next — they make the system actionable and traceable to outcomes.  
3. Add **Useful/Optional** items for real-world robustness, compliance, and long-term evolution.  
Keep each bullet concise (1–3 lines), include diagrams for Architecture & Data Flow, and attach concrete example numbers (RPS, data size, latency, SLOs) to validate decisions.
 
## FORMATTING AND STYLE REQUIREMENTS:

- **IMPORTANT**: Add one appropriate emoji at the start of EVERY main heading to make the content visually engaging
- Use proper markdown formatting with multiple heading levels (##, ###, ####)
- Include architectural diagrams, code snippets, or configuration examples using markdown code blocks where helpful
- Use tables for comparisons, specifications, or structured data
- Include mathematical formulas or capacity calculations using standard notation where relevant
- Use bullet points and numbered lists for clarity and organization
- Bold important architectural concepts and design patterns
- Create clear visual separation between major sections

## ARCHITECTURAL DEPTH REQUIREMENTS:

- **Comprehensive Coverage**: Address every significant aspect of the system design
- **Technical Precision**: Use accurate system design terminology and proven architectural patterns
- **Implementation Focus**: Include real-world considerations and operational details
- **Multi-layered Design**: Cover both high-level architecture and detailed component design
- **Cross-functional**: Address reliability, security, performance, and operational concerns
- **Evidence-based**: Reference established patterns, industry best practices, and proven approaches

## STRUCTURE FLEXIBILITY:

You have complete freedom to organize the content using headings that make the most sense for this specific system design. The headings provided above are guidelines - adapt, modify, merge, or create new headings as needed to best explain this particular system architecture. Some designs might need more focus on data architecture, others on microservices patterns, others on real-time processing, etc.

## AUDIENCE CONSIDERATION:

Write for a technical audience that includes:
- Software architects and senior engineers
- System designers and technical leads
- Engineering managers making architectural decisions
- DevOps and SRE professionals
- Anyone who needs to understand, implement, or operate this system design

The explanation should be thorough enough that someone could understand not just what this system looks like, but WHY it's designed this way, HOW each component contributes to the overall goals, and WHEN/WHERE to apply similar patterns effectively.

Remember: This should read like a comprehensive system design document written by a world-class systems architect. Make it authoritative, detailed, and practically useful while being engaging and well-structured. ALWAYS add appropriate emojis to ALL main headings for visual appeal.
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

    // Step 1: Get current system design counter
    const { data: counterData, error: counterError } = await supabase
      .from('questions_done')
      .select('system_design')
      .single();

    if (counterError) {
      console.error('Error fetching counter:', counterError);
      return NextResponse.json(
        { error: 'Failed to fetch system design counter' },
        { status: 500 }
      );
    }

    const currentCount = counterData.system_design || 0;
    const nextDesignId = currentCount + 1;

    // Step 2: Get the next system design
    let query = supabase
      .from('system_design')
      .select('*');

    if (!forceRegenerate) {
      // Get the specific next design based on counter
      query = query.eq('id', nextDesignId);
    } else {
      query = query.eq('id', nextDesignId);
    }

    const { data: designsData, error: designError } = await query;

    if (designError) {
      console.error('Error fetching system design:', designError);
      return NextResponse.json(
        { error: 'Database error while fetching system design', details: designError.message },
        { status: 500 }
      );
    }

    if (!designsData || designsData.length === 0) {
      console.log(`No system design found with ID ${nextDesignId}. Current counter: ${currentCount}`);
      
      // Check if there are any designs in the table at all
      const { data: allDesigns, error: countError } = await supabase
        .from('system_design')
        .select('id')
        .order('id', { ascending: true });
        
      if (countError) {
        return NextResponse.json(
          { error: 'Failed to check available system designs' },
          { status: 500 }
        );
      }
      
      const totalDesigns = allDesigns?.length || 0;
      
      return NextResponse.json(
        { 
          error: 'No more system designs available or design not found',
          details: {
            requestedDesignId: nextDesignId,
            currentCounter: currentCount,
            totalDesignsInRepo: totalDesigns,
            availableDesignIds: allDesigns?.map(d => d.id) || []
          }
        },
        { status: 404 }
      );
    }

    const design = designsData[0] as SystemDesign;

    // Step 3: Generate comprehensive system design theory using Groq
    const prompt = createSystemDesignPrompt(design.name);
    console.log('Generating theory for system design:', design.id, '-', design.name);

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "system",
          content: "You are a distinguished senior systems architect and distributed systems expert with deep knowledge across all areas of system design. You create comprehensive, architecturally rigorous explanations that serve as authoritative implementation guides. Your explanations combine system architecture patterns, scalability strategies, operational considerations, and real-world implementation details. You have complete autonomy to structure your response with appropriate headings that best explain the specific system design. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging and easier to navigate."
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
      .from('system_design')
      .update({ 
        theory: generatedTheory
      })
      .eq('id', design.id);

    if (updateError) {
      console.error('Error updating design with theory:', updateError);
      return NextResponse.json(
        { error: 'Failed to save theory' },
        { status: 500 }
      );
    }

    // Step 5: Update counter only if processing sequentially
    if (!forceRegenerate && design.id === nextDesignId) {
      const { error: incrementError } = await supabase
        .from('questions_done')
        .update({ 
          system_design: design.id
        })
        .eq('system_design', currentCount);

      if (incrementError) {
        console.error('Error incrementing counter:', incrementError);
      }
    }

    return NextResponse.json({
      success: true,
      designId: design.id,
      designName: design.name,
      theory: generatedTheory,
      previousCount: currentCount,
      newCount: design.id,
      theoryLength: generatedTheory.length,
      wordCount: generatedTheory.split(' ').length,
      estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
      message: 'Comprehensive system design theory generated and saved successfully'
    });

  } catch (error) {
    console.error('GET API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST method for targeted design processing
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
    const { designId, designIds, batchSize = 3 } = body;
    
    // Handle batch processing
    if (designIds && Array.isArray(designIds)) {
      const results = [];
      
      for (const id of designIds.slice(0, batchSize)) {
        try {
          const result = await processSystemDesign(id);
          results.push(result);
        } catch (error) {
          results.push({
            designId: id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
      
      return NextResponse.json({
        success: true,
        batchResults: results,
        processedCount: results.filter(r => r.success).length,
        totalRequested: designIds.length,
        message: `Processed ${results.filter(r => r.success).length} out of ${designIds.length} system designs`
      });
    }

    // Handle single design processing
    if (designId) {
      const result = await processSystemDesign(designId);
      return NextResponse.json(result);
    }

    // Handle processing designs without theories
    let query = supabase
      .from('system_design')
      .select('id, name')
      .is('theory', null)
      .limit(batchSize);

    const { data: designs, error } = await query;

    if (error || !designs || designs.length === 0) {
      return NextResponse.json(
        { error: 'No system designs without theories found' },
        { status: 404 }
      );
    }

    const results = [];
    for (const design of designs) {
      try {
        const result = await processSystemDesign(design.id);
        results.push(result);
      } catch (error) {
        results.push({
          designId: design.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      batchResults: results,
      processedCount: results.filter(r => r.success).length,
      message: `Processed ${results.filter(r => r.success).length} system designs without theories`
    });

  } catch (error) {
    console.error('POST API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// Helper function to process individual system designs
async function processSystemDesign(designId: number) {
  const { data: designData, error: designError } = await supabase
    .from('system_design')
    .select('*')
    .eq('id', designId)
    .single();

  if (designError || !designData) {
    throw new Error(`System design ${designId} not found`);
  }

  const design = designData as SystemDesign;
  
  const prompt = createSystemDesignPrompt(design.name);

  const completion = await groq.chat.completions.create({
    messages: [
      {
        role: "system",
        content: "You are a distinguished senior systems architect and distributed systems expert creating comprehensive architectural reference materials. You structure content with clear, logical headings that best explain each specific system design. Your explanations combine deep architectural knowledge with practical implementation insights. IMPORTANT: Add appropriate emojis at the start of ALL main headings to make the content visually engaging."
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
    .from('system_design')
    .update({ 
      theory: generatedTheory,
    })
    .eq('id', designId);

  if (updateError) {
    throw new Error(`Failed to save theory for system design ${designId}`);
  }

  return {
    success: true,
    designId,
    designName: design.name,
    theoryLength: generatedTheory.length,
    wordCount: generatedTheory.split(' ').length,
    estimatedReadTime: Math.ceil(generatedTheory.split(' ').length / 200),
    message: 'System design theory generated successfully'
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

    const { designId, regenerateTheory = false } = await request.json();
    
    if (!designId) {
      return NextResponse.json(
        { error: 'Design ID is required' },
        { status: 400 }
      );
    }

    if (regenerateTheory) {
      const result = await processSystemDesign(designId);
      return NextResponse.json({
        ...result,
        message: 'System design theory regenerated successfully'
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

// DELETE method for removing designs or resetting theories
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

    const { designId, resetTheory = false, resetCounter = false } = await request.json();
    
    if (resetCounter) {
      const { error: resetError } = await supabase
        .from('questions_done')
        .update({ system_design: 0 });
      
      if (resetError) {
        throw new Error('Failed to reset counter');
      }
      
      return NextResponse.json({
        success: true,
        message: 'System designs counter reset to 0'
      });
    }
    
    if (resetTheory && designId) {
      const { error: resetError } = await supabase
        .from('system_design')
        .update({ theory: null })
        .eq('id', designId);
      
      if (resetError) {
        throw new Error(`Failed to reset theory for design ${designId}`);
      }
      
      return NextResponse.json({
        success: true,
        designId,
        message: 'Theory reset successfully'
      });
    }

    return NextResponse.json(
      { error: 'Specify designId with resetTheory: true, or resetCounter: true' },
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