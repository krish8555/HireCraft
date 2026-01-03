import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

// Dedicated API keys for specific tasks
const API_KEYS = {
  RESUME_PARSING: process.env.GEMINI_API_KEY_RESUME_PARSING!,
  JD_MATCHING: process.env.GEMINI_API_KEY_JD_MATCHING!,
  INTERVIEW: process.env.GEMINI_API_KEY_INTERVIEW!,
};

function getGeminiClient(task: "RESUME_PARSING" | "JD_MATCHING" | "INTERVIEW") {
  const apiKey = API_KEYS[task];
  if (!apiKey) {
    throw new Error(`No Gemini API key configured for task: ${task}`);
  }
  return new GoogleGenerativeAI(apiKey);
}

// New function to analyze PDF directly with Gemini
export async function analyzeResumeWithPDF(
  pdfBuffer: Buffer,
  fileName: string,
  jobDescription: string,
  jobTitle: string
) {
  const apiKey = API_KEYS.JD_MATCHING;
  const fileManager = new GoogleAIFileManager(apiKey);
  const genAI = new GoogleGenerativeAI(apiKey);

  // Write buffer to temporary file
  const fs = require("fs");
  const path = require("path");
  const tmpDir = require("os").tmpdir();
  const tmpFilePath = path.join(tmpDir, fileName);

  fs.writeFileSync(tmpFilePath, pdfBuffer);

  try {
    // Upload PDF to Gemini
    const uploadResponse = await fileManager.uploadFile(tmpFilePath, {
      mimeType: "application/pdf",
      displayName: fileName,
    });

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `You are an expert AI recruiter with 15+ years of experience in talent acquisition and candidate assessment.

**POSITION:** ${jobTitle}

**JOB REQUIREMENTS:**
${jobDescription}

**TASK:** Analyze the attached resume PDF and provide:

1. **Extract Resume Content:** Parse all text from the PDF including education, experience, skills, projects, certifications
2. **Educational Background Analysis:** Degrees, institutions, GPA, relevant coursework
3. **Professional Experience Analysis:** Years, companies, roles, technologies, achievements
4. **Technical Skills Assessment:** Languages, frameworks, tools, domain knowledge
5. **Projects & Achievements:** Notable work, measurable impact
6. **Career Trajectory:** Growth, stability, gaps
7. **Overall Match Score (0-100):** Based on weighted criteria:
   - Education: 20%
   - Experience: 40%
   - Skills: 25%
   - Projects: 15%

**Scoring Guide:**
- 85-100: Outstanding match
- 70-84: Strong match
- 60-69: Good match
- 45-59: Moderate match
- Below 45: Not suitable

Return JSON:
{
  "matchScore": <number 0-100>,
  "extractedText": "<full resume text>",
  "summary": "<2-3 sentence assessment>",
  "strengths": ["strength1", "strength2", "strength3"],
  "concerns": ["concern1", "concern2"],
  "recommendation": "proceed" or "reject"
}

Only return valid JSON, no additional text.`;

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      { text: prompt },
    ]);

    const response = result.response.text();
    const jsonMatch = response.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error("Failed to parse AI response");
    }

    // Clean up temp file
    try {
      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (cleanupError) {
      console.error("Error cleaning up temp file:", cleanupError);
    }

    return JSON.parse(jsonMatch[0]);
  } catch (error) {
    // Clean up temp file on error
    try {
      if (fs.existsSync(tmpFilePath)) {
        fs.unlinkSync(tmpFilePath);
      }
    } catch (cleanupError) {
      console.error("Error cleaning up temp file on error:", cleanupError);
    }
    throw error;
  }
}

export async function analyzeResumeMatch(
  resumeText: string,
  jobDescription: string,
  jobTitle: string
) {
  const genAI = getGeminiClient("JD_MATCHING");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: 4096,
    },
  });

  const prompt = `You are an expert AI recruiter with 15+ years of experience in talent acquisition and candidate assessment.

**POSITION:** ${jobTitle}

**JOB REQUIREMENTS:**
${jobDescription}

**CANDIDATE'S COMPLETE RESUME:**
${resumeText}

**YOUR TASK:**
Conduct a comprehensive, structured analysis of this candidate by examining their resume in detail:

📋 **RESUME STRUCTURE TO ANALYZE:**
1. **Educational Background:**
   - Degrees, institutions, graduation years, GPA/honors
   - Relevant coursework, academic projects
   - Certifications and professional training
   - Does education align with job requirements?

2. **Professional Experience:**
   - Total years of experience and relevance
   - Companies worked at and their reputation/scale
   - Job titles and career progression
   - Specific responsibilities and achievements
   - Technologies/tools used in each role
   - Does experience match the seniority level needed?

3. **Technical Skills & Expertise:**
   - Programming languages, frameworks, tools
   - Domain knowledge and specializations
   - Hard skills vs. soft skills
   - How many required skills do they possess?

4. **Projects & Achievements:**
   - Notable projects and their impact
   - Quantifiable results (metrics, improvements)
   - Problem-solving examples
   - Leadership and initiative

5. **Career Growth & Stability:**
   - Logical career progression
   - Consistency in roles and duration
   - Upward mobility and increasing responsibility
   - Red flags: frequent job changes, gaps, etc.

6. **Overall Fit:**
   - Does the complete profile match our needs?
   - What unique value do they bring?
   - Potential for growth in this role?

**SCORING METHODOLOGY:**
- Education: Weight 20% | Experience: Weight 40% | Skills: Weight 25% | Projects/Achievements: Weight 15%

**MATCH SCORE GUIDE:**
- 85-100%: Outstanding fit - Exceeds requirements, immediate hire candidate
- 70-84%: Strong match - Meets all key requirements, definitely interview
- 60-69%: Good candidate - Solid qualifications, worth interviewing
- 45-59%: Moderate fit - Some gaps but shows potential
- Below 45%: Not suitable for this position

**EXPECTED JSON OUTPUT:**
{
  "matchScore": <number 0-100>,
  "strengths": [
    "Specific strength with examples (e.g., '5 years React experience at top tech companies')",
    "Another concrete strength",
    "One more key advantage"
  ],
  "gaps": [
    "Specific gap if any (e.g., 'Lacks experience with AWS cloud services')",
    "Another gap if present"
  ],
  "recommendation": "proceed" | "reject",
  "summary": "Professional 2-3 sentence summary highlighting key points from education, experience, and skills that led to this decision"
}

Be thorough, objective, and data-driven. Reference specific details from their resume. Only return valid JSON, no markdown or extra text.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  // Extract JSON from response
  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response");
  }

  return JSON.parse(jsonMatch[0]);
}

export async function generateInterviewQuestion(context: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  questionNumber: number;
  previousQA: Array<{ question: string; answer: string; feedback?: string }>;
}) {
  const genAI = getGeminiClient("INTERVIEW");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.8,
    },
  });

  const previousContext =
    context.previousQA.length > 0
      ? `\n\nPrevious Questions, Answers, and Your Feedback:\n${context.previousQA
          .map(
            (qa, i) =>
              `Q${i + 1}: ${qa.question}\nCandidate's Answer: ${qa.answer}${
                qa.feedback ? `\nYour Feedback: ${qa.feedback}` : ""
              }`
          )
          .join("\n\n")}`
      : "";

  const difficultyGuidance =
    context.questionNumber <= 2
      ? "Start with easier, introductory questions to make the candidate comfortable."
      : context.questionNumber <= 4
      ? "Ask moderate difficulty questions. Based on their previous answers, adjust the complexity."
      : context.questionNumber <= 6
      ? "Increase difficulty. Ask technical deep-dive questions or challenging scenarios."
      : "Ask advanced questions or final clarifications. Be more challenging if they've done well, or focus on areas where they struggled.";

  const prompt = `You are a Senior Technical Interviewer with 15+ years of experience conducting professional, insightful interviews.

**POSITION:** ${context.jobTitle}

**JOB REQUIREMENTS:**
${context.jobDescription.substring(0, 800)}

**CANDIDATE'S RESUME HIGHLIGHTS:**
${context.resumeText.substring(0, 1500)}
${previousContext}

**CURRENT PROGRESS:**
- Question ${context.questionNumber} of 8
- ${difficultyGuidance}

**YOUR INTERVIEWING APPROACH:**

🎯 **Key Principles:**
1. **Be Natural & Conversational** - Talk like a real person, not a robot
2. **Reference Their Background** - Mention specific details from their resume (education, past companies, projects, skills)
3. **Be Adaptive** - Adjust difficulty and topics based on their previous answers
4. **Ask Smart Questions** - Go beyond surface-level; assess depth of understanding
5. **Stay Professional** - Friendly but focused on evaluating their fit

📚 **Question Strategy by Stage:**

**Questions 1-2 (Warm-up):**
- Start with their background: "I see you graduated from [University] with a degree in [Field]..."
- Ask about their career journey: "You've worked at [Company1] and [Company2]. What motivated you to make that transition?"
- Understand motivation: "What interests you most about this [Role] position?"

**Questions 3-5 (Technical Deep-Dive):**
- Dive into specific skills on their resume: "Your resume mentions expertise in [Technology]. Can you walk me through a challenging problem you solved using it?"
- Ask about projects: "I noticed you worked on [Project Name]. What was your specific role and what challenges did you face?"
- Test problem-solving: Present scenarios related to the job requirements
- Assess depth: "How would you approach [specific technical challenge]?"

**Questions 6-8 (Advanced Fit Assessment):**
- Complex scenarios: "Imagine you're leading a team working on [relevant problem]..."
- Real challenges: "In this role, you'll need to [actual responsibility]. Given your background, how would you approach that?"
- Architecture/Design: "How would you design/architect [system relevant to role]?"
- Validate depth: Can they actually do the job based on their background?
- No generic closing questions - every question should assess if they're the right fit

**ADAPTIVE INTELLIGENCE:**
- If they mentioned specific technologies → Ask about those ACTUAL technologies from their resume
- If they worked at notable companies → Reference those ACTUAL companies from their resume
- If they have relevant projects → Dig into their ACTUAL projects mentioned in resume
- If previous answer was WEAK or shows lack of knowledge → IMMEDIATELY SWITCH to a different topic/skill from their resume
- If previous answer was STRONG → Increase complexity on the same topic OR move to next relevant skill
- If they're struggling with a topic they listed on resume → Pivot to assess other competencies they claim to have
- NEVER ask about generic examples - ONLY reference what's actually in their resume

**CRITICAL RULES:**
1. NO HARDCODED EXAMPLES - Every question must reference their actual resume content
2. READ THEIR RESUME CAREFULLY - Use their actual universities, companies, projects, technologies
3. IF THEY DON'T KNOW SOMETHING - Switch to a different skill/experience they listed
4. ADAPTIVE TOPIC SWITCHING - Don't keep asking about one topic if they're weak on it
5. VALIDATE RESUME CLAIMS - Ask about what THEY say they know, not generic examples

**YOUR TASK NOW:**
Generate ONE focused, natural question appropriate for question ${
    context.questionNumber
  }. 

IMPORTANT: 
- Reference ONLY specific details from THIS candidate's actual resume
- If previous answers showed weakness on a topic, switch to a different skill/experience from their resume
- Every question should feel personalized to THIS specific candidate
- NO generic placeholders like "TechCorp", "React experience", etc. - use their REAL background

Return ONLY the question text - no labels, no formatting, just the question.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function provideFeedback(context: {
  question: string;
  answer: string;
  resumeText: string;
  jobDescription: string;
  questionNumber: number;
}) {
  const genAI = getGeminiClient("INTERVIEW");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: 8192,
      temperature: 0.7,
    },
  });

  const prompt = `You are a professional interviewer providing real-time constructive feedback to a candidate during their interview.

**THE QUESTION YOU ASKED:**
"${context.question}"

**THE CANDIDATE'S ANSWER:**
"${context.answer}"

**CONTEXT:**
- Position: ${context.jobDescription.substring(0, 400)}
- Candidate's Complete Background: ${context.resumeText.substring(0, 800)}
- This is question ${context.questionNumber} of 8

**YOUR TASK:**
Provide immediate, constructive feedback as a professional interviewer would. Make your feedback PERSONALIZED by referencing the candidate's specific background from their resume.

**ANALYZE THEIR RESUME CONTEXT:**
Before giving feedback, consider:
- Their Education: What degree(s), institution(s), specialization?
- Their Experience: What companies, roles, technologies have they worked with?
- Their Skills: What technical/domain expertise do they claim?
- Their Projects: What relevant projects or achievements do they mention?

**FEEDBACK GUIDELINES:**

1. **Start Positive & Contextualized:**
   - Acknowledge what they did well
   - Connect it to their background: "Given your experience at [Company]..." or "With your [Degree] background..."
   
2. **Be Specific & Resume-Aware:**
   - If they mentioned a technology from their resume, validate their knowledge level
   - If they should know something based on their experience, note if it's missing
   - Point out gaps between resume claims and demonstrated knowledge
   
3. **Be Constructive & Targeted:**
   - If weak: "Based on your resume showing [X experience], I expected to hear more about..."
   - If strong: "That aligns well with the [Project/Role] you mentioned in your background"
   - If off-track: "Let me redirect - your experience with [Technology] would be more relevant here"
   
4. **Be Encouraging but Honest:**
   - Maintain supportive tone while being truthful about performance
   - Help bridge gaps between their background and the answer quality
   
5. **Be Brief:** 2-3 sentences maximum

**EXAMPLES OF GOOD PERSONALIZED FEEDBACK:**
- "Good start! Given your 2 years at Google working with React, you clearly have the fundamentals down. I'd love to hear more about how you'd scale that approach for high-traffic scenarios."
- "Excellent answer! Your explanation aligns perfectly with the microservices project you mentioned in your resume. That hands-on experience really shows."
- "I appreciate your honest approach. While your CS degree from MIT gives you strong fundamentals, I notice you haven't worked with this specific framework yet. Let's discuss something closer to the technologies you've used..."
- "That's a bit generic. Based on your resume showing 3 years of backend development, I expected a more technical deep-dive into database optimization strategies."

**CRITICAL:** Always reference something specific from their resume (education, company, project, technology) to make feedback feel personalized and professional.

Respond as if you're talking directly to the candidate in a live interview. Be professional, encouraging, context-aware, and helpful.

Provide ONLY your feedback, no additional formatting or labels.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}

export async function evaluateInterviewPerformance(context: {
  resumeText: string;
  jobDescription: string;
  jobTitle: string;
  allQA: Array<{ question: string; answer: string; feedback?: string }>;
}) {
  const genAI = getGeminiClient("INTERVIEW");
  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    generationConfig: {
      maxOutputTokens: 16384,
      temperature: 0.5,
    },
  });

  const qaText = context.allQA
    .map(
      (qa, i) =>
        `Q${i + 1}: ${qa.question}\nA${i + 1}: ${qa.answer}${
          qa.feedback ? `\nFeedback Given: ${qa.feedback}` : ""
        }`
    )
    .join("\n\n");

  const prompt = `You are the Head of Talent Acquisition conducting a comprehensive evaluation of a candidate's complete interview performance.

**POSITION:** ${context.jobTitle}

**JOB REQUIREMENTS:**
${context.jobDescription}

**CANDIDATE'S COMPLETE RESUME:**
${context.resumeText.substring(0, 2000)}

**COMPLETE INTERVIEW TRANSCRIPT:**
${qaText}

**YOUR EVALUATION TASK:**

You've just completed an 8-question interview with this candidate. Now provide a thorough, professional assessment that considers BOTH their resume/background AND their interview performance.

**STEP 1: ANALYZE THEIR RESUME STRUCTURE**
Before scoring, thoroughly review:
- **Educational Background:** Degree(s), institution(s), GPA, relevant coursework, certifications
- **Professional Experience:** Years of experience, companies worked at, job titles, responsibilities, technologies used, career progression
- **Technical Skills:** Programming languages, frameworks, tools, domain knowledge claimed
- **Projects & Achievements:** Notable projects, measurable impact, problem-solving examples
- **Career Trajectory:** Growth pattern, stability, gaps, industry transitions

**STEP 2: EVALUATE INTERVIEW PERFORMANCE**
Now assess how well they DEMONSTRATED their claimed background during the interview:

1. **Technical Proficiency (0-100):**
   - How well did they demonstrate the skills listed on their resume?
   - Did their answers match the depth expected from their years of experience?
   - Did they show genuine understanding of technologies they claim to know?
   - Were they able to discuss their projects in technical detail?
   - Consider: Resume claims vs. demonstrated knowledge gap

2. **Communication Skills (0-100):**
   - Were their answers clear, well-structured, and professional?
   - Did they effectively articulate complex technical concepts?
   - How well did they listen and provide relevant, focused responses?
   - Consider: Whether their communication level matches their claimed seniority

3. **Experience Alignment & Role Fit (0-100):**
   - Does their background genuinely align with the role requirements?
   - Did they demonstrate experience relevant to the job description?
   - How well did they connect their past work to this opportunity?
   - Did they show genuine interest and cultural fit?
   - Consider: Education match (20%), Experience relevance (40%), Skills demonstration (25%), Project alignment (15%)

4. **Overall Assessment (0-100):**
   - Holistic evaluation combining resume strength + interview performance
   - Does their interview performance validate or contradict their resume?
   - Consider consistency, authenticity, growth potential
   - Factor in how well they responded to feedback during the interview

**STEP 3: SCORING GUIDELINES**
- **85-100:** Outstanding candidate - Resume AND interview both exceptional
- **70-84:** Strong candidate - Good resume, solid interview performance
- **60-69:** Moderate candidate - Decent background but interview showed gaps
- **45-59:** Weak candidate - Resume looks ok but interview performance concerning
- **Below 45:** Not suitable - Significant gaps between resume and demonstrated ability

**STEP 4: FINAL DECISION**
   - "selected" if:
     * Overall score >= 70 AND
     * Technical score >= 65 AND
     * Their interview validated their resume claims AND
     * They meet minimum role requirements
   - "rejected" otherwise

**STEP 5: DETAILED FEEDBACK (4-6 sentences)**
Your feedback must be RESUME-AWARE and SPECIFIC:
- Reference their education: "With your [Degree] from [University]..."
- Reference their experience: "Your [X years] at [Company] working on [Technology]..."
- Reference specific answers: "When discussing [Topic], you showed/lacked..."
- Explain decision: "Based on your background and interview performance..."
- Be honest about gaps: "While your resume shows [X], your answers suggest [Y]..."
- Give actionable advice: Recommend specific areas for improvement

**STEP 6: NEXT STEPS**
   - If selected: "Congratulations! Your background in [specific detail] and strong performance in [specific area] make you a great fit. Our team will contact you within 2 business days to schedule the next round with the technical team."
   - If rejected: Professional, encouraging message. Example: "Thank you for interviewing. While your [positive aspect] is commendable, we're looking for stronger [specific gap area]. We encourage you to [specific advice] and consider applying for other roles that match your [strength area]."

**CRITICAL REQUIREMENTS:**
✓ Reference specific resume elements (education, companies, technologies, projects)
✓ Compare resume claims against interview demonstration
✓ Give concrete examples from their answers
✓ Explain score rationale clearly
✓ Make decision based on holistic resume + interview assessment

Provide a JSON response with:
{
  "overallScore": <number 0-100>,
  "technicalScore": <number 0-100>,
  "communicationScore": <number 0-100>,
  "cultureFitScore": <number 0-100>,
  "decision": "selected" or "rejected",
  "feedback": "Resume-aware, specific, professional feedback (4-6 sentences with concrete examples)",
  "nextSteps": "Clear, personalized next steps based on decision"
}

Be fair, objective, specific, and professional. Base decision on BOTH resume quality AND interview performance. Only return valid JSON, no additional text.`;

  const result = await model.generateContent(prompt);
  const response = result.response.text();

  const jsonMatch = response.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Failed to parse AI response");
  }

  return JSON.parse(jsonMatch[0]);
}
