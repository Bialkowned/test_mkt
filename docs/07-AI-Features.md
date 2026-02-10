# PeerTest Hub - AI Features Plan

## Overview

This document outlines the AI-powered features for PeerTest Hub, progressing from MVP template-based test generation to advanced OpenAI integration for intelligent test creation and submission enhancement.

**AI Provider:** OpenAI (GPT-4)  
**MVP Approach:** Template-based standardized test scripts  
**V1 Enhancement:** AI-powered test generation and submission summaries

---

## Table of Contents

1. [AI Feature Roadmap](#1-ai-feature-roadmap)
2. [MVP: Template-Based Test Scripts](#2-mvp-template-based-test-scripts)
3. [V1: OpenAI Integration](#3-v1-openai-integration)
4. [System Prompts](#4-system-prompts)
5. [Use Cases](#5-use-cases)
6. [Implementation](#6-implementation)
7. [Cost Management](#7-cost-management)
8. [Quality Assurance](#8-quality-assurance)

---

## 1. AI Feature Roadmap

### Phase 1: MVP (Template-Based) ✅

**No AI costs, immediate value**

- Pre-built test templates by category (e-commerce, SaaS, mobile, API)
- Variable substitution for customization
- Standardized test structure for consistent quality
- 10-15 curated templates covering common scenarios

**Benefits:**
- No API costs
- Instant results
- Proven test patterns
- Easy to maintain

### Phase 2: V1 (AI-Enhanced) 🚀

**OpenAI GPT-4 integration**

- AI-generated test journeys from descriptions
- Intelligent template enhancement
- Submission summary generation
- Bug report refinement

**Benefits:**
- Highly customized tests
- Natural language input
- Professional documentation
- Reduced client review time

### Phase 3: V2 (Advanced AI) 🔮

**Future considerations**

- Predictive bug detection from historical data
- Automated test case prioritization
- Intelligent tester-job matching
- Risk assessment for applications
- Multi-language support

---

## 2. MVP: Template-Based Test Scripts

### Template Categories

#### 1. E-commerce Templates

**Checkout Flow**
```json
{
  "template_id": "ecommerce_checkout",
  "name": "E-commerce Checkout Flow",
  "category": "e-commerce",
  "description": "Standard checkout process testing including cart, shipping, and payment",
  "variables": [
    {
      "name": "product_name",
      "description": "Product to purchase",
      "example": "Premium Widget",
      "required": true
    },
    {
      "name": "product_price",
      "description": "Expected product price",
      "example": "$99.99",
      "required": true
    },
    {
      "name": "shipping_method",
      "description": "Shipping option to test",
      "example": "Standard Shipping",
      "required": false
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "action_template": "Navigate to {{product_name}} product page",
      "expected_result_template": "Product page loads with correct name and price ({{product_price}})"
    },
    {
      "step_number": 2,
      "action_template": "Click 'Add to Cart' button",
      "expected_result_template": "{{product_name}} appears in cart with quantity 1"
    },
    {
      "step_number": 3,
      "action_template": "View cart and click 'Proceed to Checkout'",
      "expected_result_template": "Checkout page loads with cart summary showing {{product_price}}"
    },
    {
      "step_number": 4,
      "action_template": "Enter shipping information and select {{shipping_method}}",
      "expected_result_template": "Shipping form accepts valid input, calculates shipping cost"
    },
    {
      "step_number": 5,
      "action_template": "Enter payment information (test card: 4242 4242 4242 4242)",
      "expected_result_template": "Payment form validates card format, shows secure lock icon"
    },
    {
      "step_number": 6,
      "action_template": "Review order and click 'Place Order'",
      "expected_result_template": "Order processes successfully, confirmation page displays with order number"
    },
    {
      "step_number": 7,
      "action_template": "Check email for order confirmation",
      "expected_result_template": "Confirmation email received with order details and tracking information"
    }
  ]
}
```

**Product Search & Filter**
```json
{
  "template_id": "ecommerce_search",
  "name": "Product Search & Filtering",
  "category": "e-commerce",
  "variables": [
    {
      "name": "search_term",
      "example": "running shoes"
    },
    {
      "name": "filter_category",
      "example": "Men's"
    },
    {
      "name": "price_range",
      "example": "$50-$100"
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "action_template": "Enter '{{search_term}}' in search bar and submit",
      "expected_result_template": "Search results page displays products matching '{{search_term}}'"
    },
    {
      "step_number": 2,
      "action_template": "Apply category filter: {{filter_category}}",
      "expected_result_template": "Results filtered to show only {{filter_category}} products"
    },
    {
      "step_number": 3,
      "action_template": "Apply price range filter: {{price_range}}",
      "expected_result_template": "Results show only products within {{price_range}}"
    },
    {
      "step_number": 4,
      "action_template": "Sort results by 'Price: Low to High'",
      "expected_result_template": "Products reorder with lowest price first"
    },
    {
      "step_number": 5,
      "action_template": "Click on first product in results",
      "expected_result_template": "Product detail page loads correctly"
    }
  ]
}
```

#### 2. SaaS Application Templates

**User Registration & Onboarding**
```json
{
  "template_id": "saas_onboarding",
  "name": "SaaS User Registration & Onboarding",
  "category": "saas",
  "variables": [
    {
      "name": "app_name",
      "example": "ProjectManager Pro"
    },
    {
      "name": "key_feature",
      "example": "project creation"
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "action_template": "Navigate to {{app_name}} homepage and click 'Sign Up'",
      "expected_result_template": "Registration form displays with email, password, and name fields"
    },
    {
      "step_number": 2,
      "action_template": "Enter valid registration information and submit",
      "expected_result_template": "Account created, verification email sent message appears"
    },
    {
      "step_number": 3,
      "action_template": "Check email and click verification link",
      "expected_result_template": "Email verified, redirected to login or dashboard"
    },
    {
      "step_number": 4,
      "action_template": "Complete onboarding wizard steps",
      "expected_result_template": "Wizard guides through initial setup, tooltips explain features"
    },
    {
      "step_number": 5,
      "action_template": "Complete first key action: {{key_feature}}",
      "expected_result_template": "Action completes successfully, success message or tutorial appears"
    }
  ]
}
```

**Dashboard & Analytics**
```json
{
  "template_id": "saas_dashboard",
  "name": "Dashboard & Analytics View",
  "category": "saas",
  "steps": [
    {
      "step_number": 1,
      "action_template": "Log in and navigate to main dashboard",
      "expected_result_template": "Dashboard loads with key metrics, charts, and recent activity"
    },
    {
      "step_number": 2,
      "action_template": "Verify all dashboard widgets load within 3 seconds",
      "expected_result_template": "All widgets display data without errors or infinite loading"
    },
    {
      "step_number": 3,
      "action_template": "Interact with date range filter (Last 7 days, Last 30 days, Custom)",
      "expected_result_template": "Dashboard data updates to reflect selected time period"
    },
    {
      "step_number": 4,
      "action_template": "Click on a chart/graph to drill down into details",
      "expected_result_template": "Detailed view or modal opens with more granular data"
    },
    {
      "step_number": 5,
      "action_template": "Export data as CSV or PDF",
      "expected_result_template": "File downloads successfully with correct data"
    }
  ]
}
```

#### 3. Mobile App Templates

**Mobile Navigation & UI**
```json
{
  "template_id": "mobile_navigation",
  "name": "Mobile App Navigation Testing",
  "category": "mobile",
  "variables": [
    {
      "name": "app_name",
      "example": "FitTracker"
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "action_template": "Open {{app_name}} on mobile device",
      "expected_result_template": "App launches, splash screen displays, main screen loads within 3 seconds"
    },
    {
      "step_number": 2,
      "action_template": "Navigate through bottom tab bar (all tabs)",
      "expected_result_template": "Each tab switches correctly, content loads, no UI glitches"
    },
    {
      "step_number": 3,
      "action_template": "Open and close navigation drawer/hamburger menu",
      "expected_result_template": "Menu animates smoothly, all options visible and clickable"
    },
    {
      "step_number": 4,
      "action_template": "Test back button navigation through screens",
      "expected_result_template": "Back button functions correctly, maintains navigation stack"
    },
    {
      "step_number": 5,
      "action_template": "Rotate device between portrait and landscape",
      "expected_result_template": "UI adapts to orientation, no content cut off or broken layout"
    }
  ]
}
```

#### 4. API Testing Template

**REST API Endpoint Testing**
```json
{
  "template_id": "api_rest_testing",
  "name": "REST API Endpoint Testing",
  "category": "api",
  "variables": [
    {
      "name": "api_base_url",
      "example": "https://api.example.com/v1"
    },
    {
      "name": "endpoint",
      "example": "/users"
    }
  ],
  "steps": [
    {
      "step_number": 1,
      "action_template": "GET {{api_base_url}}{{endpoint}} - Retrieve list",
      "expected_result_template": "Status 200, returns array of items, valid JSON structure"
    },
    {
      "step_number": 2,
      "action_template": "GET {{api_base_url}}{{endpoint}}/{id} - Retrieve single item",
      "expected_result_template": "Status 200, returns single object with correct fields"
    },
    {
      "step_number": 3,
      "action_template": "POST {{api_base_url}}{{endpoint}} - Create new item",
      "expected_result_template": "Status 201, returns created object with ID, location header present"
    },
    {
      "step_number": 4,
      "action_template": "PUT {{api_base_url}}{{endpoint}}/{id} - Update item",
      "expected_result_template": "Status 200, returns updated object, changes persisted"
    },
    {
      "step_number": 5,
      "action_template": "DELETE {{api_base_url}}{{endpoint}}/{id} - Delete item",
      "expected_result_template": "Status 204, subsequent GET returns 404"
    },
    {
      "step_number": 6,
      "action_template": "Test error handling: Invalid ID, missing auth, malformed JSON",
      "expected_result_template": "Appropriate error codes (400, 401, 404), clear error messages"
    }
  ]
}
```

### Template Usage API

```python
# api/v1/ai.py
from fastapi import APIRouter, Depends
from services.template_service import TemplateService

router = APIRouter(prefix="/ai", tags=["AI"])

@router.get("/templates")
async def list_templates(
    category: str = None,
    is_premium: bool = None
):
    """List available test templates"""
    templates = await TemplateService.list_templates(
        category=category,
        is_premium=is_premium
    )
    return {"templates": templates}

@router.get("/templates/{template_id}")
async def get_template(template_id: str):
    """Get template details"""
    template = await TemplateService.get_template(template_id)
    return template

@router.post("/templates/{template_id}/apply")
async def apply_template(
    template_id: str,
    variables: dict,
    user: User = Depends(get_current_user)
):
    """Apply template with variable substitution"""
    template = await TemplateService.get_template(template_id)
    
    # Substitute variables
    journey = TemplateService.apply_variables(template, variables)
    
    return {
        "user_journey": journey,
        "template_id": template_id,
        "ai_generated": False
    }
```

### Frontend Template Selector

```tsx
// features/jobs/components/TemplateSelector.tsx
import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { getTemplates } from '@/api/ai'

export const TemplateSelector = ({ onSelect }) => {
  const [selectedCategory, setSelectedCategory] = useState('all')
  
  const { data, isLoading } = useQuery({
    queryKey: ['templates', selectedCategory],
    queryFn: () => getTemplates({ 
      category: selectedCategory === 'all' ? undefined : selectedCategory 
    })
  })
  
  const categories = ['all', 'e-commerce', 'saas', 'mobile', 'api']
  
  return (
    <div>
      {/* Category filter */}
      <div className="flex gap-2 mb-4">
        {categories.map(cat => (
          <Button
            key={cat}
            variant={selectedCategory === cat ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </Button>
        ))}
      </div>
      
      {/* Template grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data?.templates.map(template => (
          <Card key={template.template_id} hover>
            <h3 className="font-semibold mb-2">{template.name}</h3>
            <p className="text-sm text-gray-600 mb-3">
              {template.description}
            </p>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                {template.steps.length} steps
              </span>
              <Button 
                size="sm" 
                onClick={() => onSelect(template)}
              >
                Use Template
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
```

---

## 3. V1: OpenAI Integration

### Setup

```python
# services/ai_service.py
import openai
from typing import List, Dict
from config import settings

openai.api_key = settings.OPENAI_API_KEY

class AIService:
    """OpenAI integration for test generation and enhancement"""
    
    def __init__(self):
        self.model = "gpt-4-turbo-preview"  # or "gpt-3.5-turbo" for cost savings
        self.max_tokens = 2000
    
    async def generate_test_journey(
        self,
        description: str,
        project_context: str,
        additional_requirements: str = ""
    ) -> Dict:
        """Generate test journey from natural language description"""
        
        system_prompt = self._get_system_prompt_journey_generation()
        
        user_prompt = f"""
Project Context: {project_context}

Test Objective: {description}

Additional Requirements: {additional_requirements}

Generate a comprehensive test journey with clear steps.
"""
        
        response = await openai.ChatCompletion.acreate(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.7,
            max_tokens=self.max_tokens
        )
        
        # Parse response into structured format
        content = response.choices[0].message.content
        journey = self._parse_journey_response(content)
        
        return journey
    
    async def enhance_template(
        self,
        template: Dict,
        variables: Dict,
        customization_notes: str
    ) -> Dict:
        """Enhance template with AI customization"""
        
        system_prompt = self._get_system_prompt_template_enhancement()
        
        user_prompt = f"""
Template: {template['name']}
Variables: {variables}
Customization: {customization_notes}

Enhance this template with additional validation steps and edge cases.
"""
        
        response = await openai.ChatCompletion.acreate(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.5,
            max_tokens=self.max_tokens
        )
        
        content = response.choices[0].message.content
        enhanced_journey = self._parse_journey_response(content)
        
        return enhanced_journey
    
    async def generate_submission_summary(
        self,
        test_results: List[Dict],
        bugs: List[Dict],
        tester_summary: str
    ) -> str:
        """Generate professional summary of submission"""
        
        system_prompt = self._get_system_prompt_summary()
        
        user_prompt = f"""
Tester's Summary: {tester_summary}

Test Results:
{self._format_test_results(test_results)}

Bugs Found:
{self._format_bugs(bugs)}

Generate a concise, professional summary for the client.
"""
        
        response = await openai.ChatCompletion.acreate(
            model=self.model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            temperature=0.3,  # Lower temperature for consistent output
            max_tokens=500
        )
        
        return response.choices[0].message.content
```

---

## 4. System Prompts

### Journey Generation Prompt

```python
def _get_system_prompt_journey_generation(self) -> str:
    return """You are a QA expert specializing in creating comprehensive test scenarios. 
Your task is to generate detailed, step-by-step test journeys that testers can follow.

Guidelines:
1. Create 5-10 logical, sequential steps
2. Each step should have a clear action and expected result
3. Consider happy path, edge cases, and error scenarios
4. Be specific about what to test and what success looks like
5. Include validation points (e.g., "Verify button is enabled")
6. Consider cross-browser/device compatibility where relevant
7. Focus on user experience and functional correctness

Output Format (JSON):
{
  "scenario": "High-level test objective",
  "steps": [
    {
      "step_number": 1,
      "action": "Specific action to perform",
      "expected_result": "What should happen"
    }
  ]
}

Be thorough but concise. Prioritize clarity over length."""
```

### Template Enhancement Prompt

```python
def _get_system_prompt_template_enhancement(self) -> str:
    return """You are enhancing an existing test template with additional depth and coverage.

Your enhancements should:
1. Add 2-3 validation steps for each main step
2. Include edge case scenarios (empty inputs, boundary values, etc.)
3. Consider accessibility (keyboard navigation, screen readers)
4. Add performance checks where relevant (load times, responsiveness)
5. Include error handling tests
6. Suggest realistic test data

Keep the core flow intact but make it more comprehensive.
Maintain the JSON structure of the original template."""
```

### Submission Summary Prompt

```python
def _get_system_prompt_summary(self) -> str:
    return """You are a QA report writer creating executive summaries of test submissions.

Your summary should:
1. Start with an overall assessment (2-3 sentences)
2. Highlight critical findings first
3. Summarize bugs by severity
4. Note any patterns or recurring issues
5. Be professional and objective
6. Use clear, non-technical language where possible
7. Limit to 150-200 words

Structure:
- Overall Assessment
- Critical Findings (if any)
- Summary of Results
- Recommendations (optional)

Be concise and actionable."""
```

---

## 5. Use Cases

### Use Case 1: Generate Test from Description

**Scenario**: Client describes what they want tested in natural language

**Input**:
```
"I need testing for my checkout process. Users should be able to add items to 
cart, apply discount codes, and complete payment with credit card. Need to 
verify tax calculations for different states."
```

**AI Output**:
```json
{
  "scenario": "End-to-end checkout process including cart management, discount application, and payment with tax calculation validation",
  "steps": [
    {
      "step_number": 1,
      "action": "Add at least 2 different products to cart from product pages",
      "expected_result": "Cart icon updates with item count, cart subtotal displays correctly"
    },
    {
      "step_number": 2,
      "action": "Navigate to cart and verify item details (name, price, quantity, subtotal)",
      "expected_result": "All items display accurately with correct calculations"
    },
    {
      "step_number": 3,
      "action": "Apply discount code 'TEST10' for 10% off",
      "expected_result": "Discount applies correctly, new total reflects 10% reduction"
    },
    {
      "step_number": 4,
      "action": "Proceed to checkout and enter shipping address in California (CA)",
      "expected_result": "Form accepts valid CA address, tax rate calculates (CA sales tax ~7-10%)"
    },
    {
      "step_number": 5,
      "action": "Change shipping address to different state (e.g., Texas, New York)",
      "expected_result": "Tax recalculates based on new state tax rate, total updates"
    },
    {
      "step_number": 6,
      "action": "Enter test credit card: 4242 4242 4242 4242, exp: 12/25, CVC: 123",
      "expected_result": "Card form validates, shows card brand icon (Visa)"
    },
    {
      "step_number": 7,
      "action": "Submit payment and complete order",
      "expected_result": "Order processes, confirmation page shows with order number, email sent"
    },
    {
      "step_number": 8,
      "action": "Verify final charge amount matches displayed total including tax and discount",
      "expected_result": "Charged amount = (subtotal - discount) + tax + shipping"
    }
  ]
}
```

### Use Case 2: Enhance Submission with AI Summary

**Input** (Tester's rough notes):
```
"Found some issues. Payment failed 2 times but worked on 3rd try. Shipping form 
has weird spacing on Safari. Tax calculation seems off for NY addresses. 
Otherwise checkout works fine."
```

**AI Output**:
```
Comprehensive checkout flow evaluation completed with mixed results. Testing 
identified payment processing instability with 40% failure rate across 5 attempts, 
requiring immediate investigation of gateway timeout handling. Additional findings 
include CSS layout inconsistency in shipping form specific to Safari browser and 
potential tax calculation error for New York state addresses. Core functionality 
operates as expected with successful order completion post-payment resolution. 
Recommend prioritizing payment reliability before production deployment.
```

### Use Case 3: Template + AI Hybrid

**Flow**:
1. Client selects "E-commerce Checkout" template
2. Provides variables: product="Laptop", price="$1299"
3. Adds note: "Focus on mobile Safari, test Apple Pay"
4. AI enhances template with mobile-specific steps and Apple Pay validation

---

## 6. Implementation

### Backend API Endpoints

```python
# API endpoint for AI journey generation
@router.post("/ai/generate-journey")
async def generate_journey(
    request: GenerateJourneyRequest,
    user: User = Depends(get_current_user),
    ai_service: AIService = Depends()
):
    """Generate test journey using AI"""
    
    # Check if user has Pro plan
    if user.client_data.membership_tier == 'starter':
        raise HTTPException(403, "AI features require Pro or Team plan")
    
    # Generate journey
    journey = await ai_service.generate_test_journey(
        description=request.description,
        project_context=request.project_context,
        additional_requirements=request.additional_requirements
    )
    
    # Log usage for billing
    await ai_usage_log.create({
        'user_id': user.id,
        'feature': 'journey_generation',
        'tokens_used': journey['tokens_used'],
        'cost_usd': journey['cost']
    })
    
    return {
        'user_journey': journey,
        'ai_generated': True
    }

# Enhance submission summary (called internally on submission)
@router.post("/submissions/{submission_id}/enhance")
async def enhance_submission(
    submission_id: str,
    ai_service: AIService = Depends()
):
    """Generate AI-enhanced summary for submission"""
    
    submission = await Submission.get(submission_id)
    
    enhanced_summary = await ai_service.generate_submission_summary(
        test_results=submission.test_results,
        bugs=submission.bugs,
        tester_summary=submission.summary
    )
    
    submission.ai_enhanced_summary = enhanced_summary
    await submission.save()
    
    return {
        'ai_enhanced_summary': enhanced_summary
    }
```

### Error Handling

```python
async def generate_test_journey(self, description: str, **kwargs):
    try:
        response = await openai.ChatCompletion.acreate(...)
        return self._parse_response(response)
        
    except openai.error.RateLimitError:
        # Retry with exponential backoff
        await asyncio.sleep(2)
        return await self.generate_test_journey(description, **kwargs)
        
    except openai.error.InvalidRequestError as e:
        # Input too long or invalid
        raise HTTPException(400, f"Invalid request: {str(e)}")
        
    except openai.error.AuthenticationError:
        # API key issue
        raise HTTPException(500, "AI service configuration error")
        
    except Exception as e:
        # Fallback to template if AI fails
        logger.error(f"AI generation failed: {e}")
        return self._get_fallback_template(description)
```

---

## 7. Cost Management

### Token Usage Estimation

**GPT-4 Turbo Pricing** (as of 2024):
- Input: $0.01 per 1K tokens
- Output: $0.03 per 1K tokens

**Typical Usage**:
- Journey generation: ~1000 input + 800 output = $0.034 per generation
- Summary enhancement: ~500 input + 200 output = $0.011 per summary

**Monthly Cost Estimates**:
- 100 journey generations: $3.40
- 500 submission enhancements: $5.50
- Total: ~$10/month for moderate usage

### Cost Control Strategies

```python
class AIService:
    def __init__(self):
        self.daily_limit_per_user = 10  # Max AI calls per user per day
        self.cache_enabled = True
        
    async def generate_with_cache(self, prompt: str, cache_key: str):
        """Check cache before calling OpenAI"""
        
        # Check Redis cache
        cached = await redis.get(f"ai_cache:{cache_key}")
        if cached and self.cache_enabled:
            return json.loads(cached)
        
        # Generate with AI
        result = await self._call_openai(prompt)
        
        # Cache for 24 hours
        await redis.setex(
            f"ai_cache:{cache_key}",
            86400,
            json.dumps(result)
        )
        
        return result
    
    async def check_rate_limit(self, user_id: str) -> bool:
        """Check if user has exceeded daily limit"""
        
        key = f"ai_usage:{user_id}:{date.today()}"
        usage = await redis.get(key)
        
        if usage and int(usage) >= self.daily_limit_per_user:
            return False
        
        await redis.incr(key)
        await redis.expire(key, 86400)  # 24 hours
        
        return True
```

### Model Selection

```python
def select_model(feature: str, tier: str) -> str:
    """Choose model based on feature and user tier"""
    
    if tier == 'team':
        # Team plan gets GPT-4
        return "gpt-4-turbo-preview"
    elif tier == 'pro':
        # Pro gets GPT-4 for journey, 3.5 for summaries
        if feature == 'journey_generation':
            return "gpt-4-turbo-preview"
        else:
            return "gpt-3.5-turbo"
    else:
        # Starter doesn't get AI
        raise HTTPException(403, "Upgrade to Pro for AI features")
```

---

## 8. Quality Assurance

### Output Validation

```python
def _validate_journey_structure(self, journey: Dict) -> bool:
    """Validate AI-generated journey meets requirements"""
    
    required_fields = ['scenario', 'steps']
    if not all(field in journey for field in required_fields):
        return False
    
    if not isinstance(journey['steps'], list) or len(journey['steps']) == 0:
        return False
    
    for step in journey['steps']:
        if not all(field in step for field in ['step_number', 'action', 'expected_result']):
            return False
        
        # Check minimum length
        if len(step['action']) < 10 or len(step['expected_result']) < 10:
            return False
    
    return True

def _parse_journey_response(self, content: str) -> Dict:
    """Parse and validate AI response"""
    
    try:
        # Try to parse as JSON
        journey = json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```json\n(.*?)\n```', content, re.DOTALL)
        if json_match:
            journey = json.loads(json_match.group(1))
        else:
            raise ValueError("Could not parse AI response as JSON")
    
    if not self._validate_journey_structure(journey):
        raise ValueError("AI response doesn't match required structure")
    
    return journey
```

### Fallback Mechanisms

```python
async def generate_with_fallback(self, description: str) -> Dict:
    """Try AI, fall back to template if it fails"""
    
    try:
        return await self.generate_test_journey(description)
    except Exception as e:
        logger.warning(f"AI generation failed, using template fallback: {e}")
        
        # Find best matching template
        category = self._detect_category(description)
        template = await TemplateService.get_default_template(category)
        
        # Basic variable extraction
        variables = self._extract_variables(description)
        
        return TemplateService.apply_variables(template, variables)
```

---

## Assumptions and Alternatives

### Assumptions
1. **OpenAI API availability** and stable pricing
2. **English language** only for MVP
3. **Pro/Team plans** have AI features
4. **Rate limiting** acceptable for users (10/day)

### Alternative Approaches
1. **Anthropic Claude** instead of OpenAI
2. **Open-source LLMs** (Llama 2, Mistral) for cost savings
3. **Prompt caching** to reduce token usage
4. **Fine-tuned models** for specific test domains
5. **Hybrid approach**: Templates + AI enhancement only

### Future Enhancements
- **Multi-language support** with translation
- **Voice-to-test** (speech → test generation)
- **Image analysis** (screenshot → bug description)
- **Historical learning** (improve based on past submissions)
- **Collaborative AI** (suggest improvements to testers)

---

## Next Steps

1. **Implement template system** (MVP)
2. **Curate 10-15 templates** across categories
3. **Build template selector UI**
4. **Set up OpenAI account** and API keys
5. **Implement AI service layer** with error handling
6. **Add cost tracking** and rate limiting
7. **Test AI outputs** for quality and consistency
8. **Beta test with Pro users**
9. **Monitor costs** and adjust as needed
10. **Iterate based on feedback**

