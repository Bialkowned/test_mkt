# PeerTest Hub - Innovation Group Rollout

## Overview

This document outlines the **Innovation Group** feature set for PeerTest Hub, enabling multi-tenant organization support, team collaboration, and enterprise-grade features. This transforms PeerTest Hub from an individual user platform to a comprehensive team testing solution.

**Target Audience:** Mid-size to enterprise companies with dedicated QA teams  
**Plan Tier:** Team ($199/month) and Enterprise (custom pricing)

---

## Table of Contents

1. [Vision & Goals](#1-vision--goals)
2. [Organization Model](#2-organization-model)
3. [Team Permissions & RBAC](#3-team-permissions--rbac)
4. [Organization Billing](#4-organization-billing)
5. [Shared Resources](#5-shared-resources)
6. [Collaboration Features](#6-collaboration-features)
7. [Enterprise Features Roadmap](#7-enterprise-features-roadmap)
8. [Migration Path](#8-migration-path)
9. [Pricing Strategy](#9-pricing-strategy)

---

## 1. Vision & Goals

### Problem Statement

**Individual user limitations:**
- Each team member needs separate account and billing
- No visibility into team's testing activities
- Duplicate projects and fragmented test data
- Difficult to manage multiple testers across projects
- No centralized billing or usage reporting

### Innovation Group Solution

**Multi-tenant organization platform:**
- Unified team workspace with shared projects
- Role-based access control for team members
- Centralized billing and usage analytics
- Collaborative test planning and review
- Enterprise-grade security and compliance

### Key Goals

1. **Team Efficiency**: Reduce redundancy, improve collaboration
2. **Management Visibility**: Centralized dashboards and reporting
3. **Cost Optimization**: Single billing, volume pricing
4. **Scale**: Support teams from 5 to 100+ members
5. **Enterprise Ready**: SSO, audit logs, compliance features

---

## 2. Organization Model

### Data Structure

```javascript
// MongoDB organizations collection
{
  _id: ObjectId,
  name: String,                    // "TechCorp QA Team"
  slug: String,                    // "techcorp-qa" (unique URL identifier)
  
  // Details
  description: String,
  logo_url: String,
  website: String,
  industry: String,
  size: String,                    // "1-10" | "11-50" | "51-200" | "201+"
  
  // Plan
  plan: String,                    // "team" | "enterprise"
  billing_email: String,
  stripe_customer_id: String,
  stripe_subscription_id: String,
  
  // Settings
  settings: {
    require_approval_for_jobs: Boolean,
    default_project_visibility: String,  // "organization" | "public"
    allow_external_testers: Boolean,
    custom_branding: Boolean,
    sso_enabled: Boolean,
    ip_whitelist: [String]
  },
  
  // Limits (based on plan)
  limits: {
    max_members: Number,           // 20 for Team, unlimited for Enterprise
    max_concurrent_jobs: Number,
    max_projects: Number,
    storage_gb: Number
  },
  
  // Usage tracking
  usage: {
    member_count: Number,
    active_jobs_count: Number,
    projects_count: Number,
    storage_used_gb: Number
  },
  
  // Status
  status: String,                  // "active" | "trial" | "suspended"
  trial_ends_at: Date,
  
  // Metadata
  created_by_id: ObjectId,         // Owner
  created_at: Date,
  updated_at: Date
}
```

### Organization Hierarchy

```
Organization (TechCorp QA)
├── Owner (full control)
├── Admins (manage members, billing)
├── Members (standard access)
│
├── Projects
│   ├── E-commerce Platform
│   ├── Mobile App
│   └── API Services
│
├── Teams (optional sub-groups)
│   ├── Web Team
│   ├── Mobile Team
│   └── Backend Team
│
└── Shared Resources
    ├── Test Templates
    ├── Device Pool
    └── Style Guide
```

---

## 3. Team Permissions & RBAC

### Role Definitions

#### Owner
**Capabilities:**
- All permissions
- Delete organization
- Transfer ownership
- Access billing
- Manage admins

**Use Case:** Founder or executive sponsor

#### Admin
**Capabilities:**
- Invite/remove members
- Manage projects
- Configure settings
- View billing (no modify)
- Assign roles (except Owner)

**Use Case:** QA Manager, Team Lead

#### Member
**Capabilities:**
- Create projects
- Create jobs within organization
- View organization jobs/projects
- Collaborate on team projects
- Access shared resources

**Use Case:** QA Engineer, Product Manager

#### Viewer (Optional)
**Capabilities:**
- Read-only access
- View jobs and submissions
- View reports
- No create/edit permissions

**Use Case:** Stakeholder, Executive

### Permission Matrix

| Action | Owner | Admin | Member | Viewer |
|--------|-------|-------|--------|--------|
| Create Organization | ✅ | ❌ | ❌ | ❌ |
| Delete Organization | ✅ | ❌ | ❌ | ❌ |
| Invite Members | ✅ | ✅ | ❌ | ❌ |
| Remove Members | ✅ | ✅ | ❌ | ❌ |
| Assign Roles | ✅ | ✅ (not Owner) | ❌ | ❌ |
| Manage Billing | ✅ | ❌ | ❌ | ❌ |
| View Billing | ✅ | ✅ | ❌ | ❌ |
| Configure Settings | ✅ | ✅ | ❌ | ❌ |
| Create Project | ✅ | ✅ | ✅ | ❌ |
| Delete Project | ✅ | ✅ | Owner only | ❌ |
| Create Job | ✅ | ✅ | ✅ | ❌ |
| Review Submission | ✅ | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ✅ | ✅ |

### Implementation

```python
# models/organization.py
from enum import Enum

class OrganizationRole(str, Enum):
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"
    VIEWER = "viewer"

class OrganizationPermission:
    """Permission checker for organization actions"""
    
    @staticmethod
    def can_invite_members(user_role: OrganizationRole) -> bool:
        return user_role in [OrganizationRole.OWNER, OrganizationRole.ADMIN]
    
    @staticmethod
    def can_manage_billing(user_role: OrganizationRole) -> bool:
        return user_role == OrganizationRole.OWNER
    
    @staticmethod
    def can_create_project(user_role: OrganizationRole) -> bool:
        return user_role in [
            OrganizationRole.OWNER,
            OrganizationRole.ADMIN,
            OrganizationRole.MEMBER
        ]
    
    @staticmethod
    def can_delete_organization(user_role: OrganizationRole) -> bool:
        return user_role == OrganizationRole.OWNER

# dependencies.py
async def require_org_permission(
    permission: str,
    org_id: str,
    user: User = Depends(get_current_user)
):
    """Dependency to check organization permissions"""
    
    if user.organization_id != org_id:
        raise HTTPException(403, "Not a member of this organization")
    
    user_role = user.organization_role
    
    permission_map = {
        'invite_members': OrganizationPermission.can_invite_members,
        'manage_billing': OrganizationPermission.can_manage_billing,
        'create_project': OrganizationPermission.can_create_project,
        'delete_organization': OrganizationPermission.can_delete_organization
    }
    
    checker = permission_map.get(permission)
    if not checker or not checker(user_role):
        raise HTTPException(403, f"Insufficient permissions: {permission}")
    
    return user
```

---

## 4. Organization Billing

### Unified Billing Model

**Benefits:**
- Single invoice for entire team
- Volume discounts
- Centralized payment method
- Usage-based add-ons

### Pricing Structure

**Team Plan: $199/month**
- Up to 20 members
- Unlimited projects
- 50 concurrent jobs
- 100GB storage
- Standard support

**Enterprise Plan: Custom**
- Unlimited members
- Unlimited projects
- Unlimited jobs
- Custom storage
- Dedicated support
- SLA guarantee
- Custom integrations

### Add-on Pricing

| Add-on | Price |
|--------|-------|
| Additional 10 members | $50/month |
| Additional 50GB storage | $20/month |
| Priority tester pool | $100/month |
| White-label branding | $500/month |
| SSO integration | $200/month |

### Billing Implementation

```python
# services/billing_service.py
class OrganizationBillingService:
    """Manage organization billing"""
    
    async def create_organization_subscription(
        self,
        organization: Organization,
        plan: str,
        payment_method_id: str
    ) -> Dict:
        """Create Stripe subscription for organization"""
        
        # Create or get Stripe customer
        if not organization.stripe_customer_id:
            customer = stripe.Customer.create(
                email=organization.billing_email,
                name=organization.name,
                metadata={'organization_id': str(organization.id)}
            )
            organization.stripe_customer_id = customer.id
            await organization.save()
        
        # Create subscription
        subscription = stripe.Subscription.create(
            customer=organization.stripe_customer_id,
            items=[{
                'price': self._get_price_id(plan)
            }],
            payment_method=payment_method_id,
            metadata={
                'organization_id': str(organization.id),
                'plan': plan
            }
        )
        
        organization.stripe_subscription_id = subscription.id
        organization.plan = plan
        await organization.save()
        
        return {
            'subscription_id': subscription.id,
            'status': subscription.status
        }
    
    async def add_seats(
        self,
        organization: Organization,
        additional_seats: int
    ) -> Dict:
        """Add member seats to subscription"""
        
        # Add subscription item for additional seats
        subscription = stripe.Subscription.retrieve(
            organization.stripe_subscription_id
        )
        
        stripe.SubscriptionItem.create(
            subscription=subscription.id,
            price='price_additional_seats',
            quantity=additional_seats
        )
        
        # Update limits
        organization.limits['max_members'] += additional_seats * 10
        await organization.save()
        
        return {
            'new_max_members': organization.limits['max_members']
        }
    
    async def generate_usage_report(
        self,
        organization: Organization,
        start_date: date,
        end_date: date
    ) -> Dict:
        """Generate billing usage report"""
        
        jobs = await Job.find({
            'organization_id': organization.id,
            'created_at': {'$gte': start_date, '$lte': end_date}
        }).to_list()
        
        total_spent = sum(job.total_budget_usd for job in jobs)
        platform_fees = total_spent * 0.15
        
        return {
            'period': {
                'start': start_date,
                'end': end_date
            },
            'summary': {
                'jobs_created': len(jobs),
                'total_spent_usd': total_spent,
                'platform_fees_usd': platform_fees,
                'member_count': organization.usage['member_count'],
                'storage_used_gb': organization.usage['storage_used_gb']
            },
            'breakdown_by_project': self._breakdown_by_project(jobs)
        }
```

### Usage Dashboard

```tsx
// features/organizations/components/UsageDashboard.tsx
import { useQuery } from '@tanstack/react-query'
import { Card } from '@/components/ui/Card'
import { getOrganizationUsage } from '@/api/organizations'

export const OrganizationUsageDashboard = ({ orgId }) => {
  const { data } = useQuery({
    queryKey: ['org-usage', orgId],
    queryFn: () => getOrganizationUsage(orgId)
  })
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card>
        <h3 className="text-lg font-semibold mb-2">Members</h3>
        <div className="text-3xl font-bold">
          {data?.usage.member_count} / {data?.limits.max_members}
        </div>
        <p className="text-sm text-gray-600">Active team members</p>
      </Card>
      
      <Card>
        <h3 className="text-lg font-semibold mb-2">Active Jobs</h3>
        <div className="text-3xl font-bold">
          {data?.usage.active_jobs_count} / {data?.limits.max_concurrent_jobs}
        </div>
        <p className="text-sm text-gray-600">Concurrent testing jobs</p>
      </Card>
      
      <Card>
        <h3 className="text-lg font-semibold mb-2">Storage</h3>
        <div className="text-3xl font-bold">
          {data?.usage.storage_used_gb} / {data?.limits.storage_gb} GB
        </div>
        <p className="text-sm text-gray-600">Screenshots and files</p>
      </Card>
    </div>
  )
}
```

---

## 5. Shared Resources

### Organization-Wide Projects

**Visibility Controls:**
- **Organization-only**: Visible to all org members
- **Public**: Visible on marketplace for external testers
- **Private**: Visible to specific team members only

```python
# When creating job
@router.post("/jobs")
async def create_job(
    job_data: JobCreate,
    user: User = Depends(get_current_user)
):
    job = Job(
        **job_data.dict(),
        client_id=user.id,
        organization_id=user.organization_id,  # Inherit from user
        visibility=job_data.visibility or 'organization'
    )
    
    # Check if org allows external testers
    if job.visibility == 'public':
        org = await Organization.get(user.organization_id)
        if not org.settings['allow_external_testers']:
            raise HTTPException(403, "Organization doesn't allow external testers")
    
    await job.save()
    return job
```

### Shared Test Templates

Organizations can create custom templates visible to all members:

```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  name: "Company-Specific Login Flow",
  description: "Standard login test for all our applications",
  steps: [...],
  created_by: ObjectId,
  is_shared: true,
  created_at: Date
}
```

### Team Device Pool

Organizations can register shared test devices:

```javascript
{
  _id: ObjectId,
  organization_id: ObjectId,
  device_name: "iPhone 15 Pro - Team Device",
  device_type: "mobile",
  os: "iOS 17.2",
  location: "SF Office",
  assigned_to: ObjectId,  // null if available
  status: "available" | "in_use" | "maintenance"
}
```

---

## 6. Collaboration Features

### Team Activity Feed

```tsx
// features/organizations/components/ActivityFeed.tsx
export const OrganizationActivityFeed = ({ orgId }) => {
  const { data } = useQuery({
    queryKey: ['org-activity', orgId],
    queryFn: () => getOrganizationActivity(orgId)
  })
  
  return (
    <div className="space-y-3">
      {data?.activities.map(activity => (
        <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
          <UserAvatar user={activity.user} />
          <div className="flex-1">
            <p className="text-sm">
              <strong>{activity.user.name}</strong> {activity.action}
            </p>
            <p className="text-xs text-gray-500">
              {formatRelativeTime(activity.created_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

// Example activities:
// - "created job 'Homepage Testing'"
// - "approved submission from Sarah J."
// - "invited john@company.com to team"
// - "created project 'Mobile App V2'"
```

### @Mentions in Comments

```python
# When creating comment/message
@router.post("/jobs/{job_id}/comments")
async def add_comment(
    job_id: str,
    comment_data: CommentCreate,
    user: User = Depends(get_current_user)
):
    # Parse @mentions
    mentions = re.findall(r'@(\w+)', comment_data.text)
    
    comment = Comment(
        job_id=job_id,
        user_id=user.id,
        text=comment_data.text,
        mentions=mentions,
        created_at=datetime.utcnow()
    )
    await comment.save()
    
    # Notify mentioned users
    for username in mentions:
        mentioned_user = await User.find_one({'username': username})
        if mentioned_user:
            await notification_service.send(
                user_id=mentioned_user.id,
                type='mention',
                title=f'{user.full_name} mentioned you',
                message=comment.text,
                action_url=f'/jobs/{job_id}'
            )
    
    return comment
```

### Collaborative Job Review

Multiple team members can review and approve submissions:

```python
# Submission approval workflow
class SubmissionApproval:
    job: Job
    submission: Submission
    
    async def request_review(self, reviewer_ids: List[str]):
        """Request review from specific team members"""
        for reviewer_id in reviewer_ids:
            await notification_service.send(
                user_id=reviewer_id,
                type='review_request',
                title='Review Request',
                message=f'Please review submission for {self.job.title}'
            )
    
    async def add_review(self, user_id: str, decision: str, notes: str):
        """Add review from team member"""
        review = {
            'reviewer_id': user_id,
            'decision': decision,  # 'approve' | 'reject' | 'request_changes'
            'notes': notes,
            'reviewed_at': datetime.utcnow()
        }
        
        self.submission.reviews.append(review)
        await self.submission.save()
        
        # Auto-approve if all required reviews are positive
        if self._all_reviews_positive():
            await self._auto_approve()
```

---

## 7. Enterprise Features Roadmap

### Phase 1: Foundation (Launch)
- ✅ Organization creation and management
- ✅ Team member invitations
- ✅ Role-based access control
- ✅ Unified billing
- ✅ Shared projects

### Phase 2: Collaboration (Q2)
- Team activity feed
- @mentions and notifications
- Collaborative submission review
- Custom test templates
- Shared device pool

### Phase 3: Security & Compliance (Q3)
- Single Sign-On (SSO) via SAML/OAuth
- IP whitelisting
- Audit logs
- Two-factor authentication (2FA) enforcement
- Data retention policies
- GDPR compliance tools

### Phase 4: Advanced Features (Q4)
- Custom workflows and approvals
- Advanced analytics and reporting
- API access for integrations
- Webhooks for CI/CD
- White-label branding
- Custom SLA agreements

### Phase 5: Enterprise Scale (2025)
- Multi-region support
- Dedicated infrastructure option
- Advanced security (SOC 2, ISO 27001)
- Professional services team
- Custom integrations (Jira, Slack, etc.)

---

## 8. Migration Path

### From Individual to Organization

**Scenario**: Existing user wants to create organization for their team

**Migration Flow:**
1. User clicks "Create Organization"
2. Organization created, user becomes Owner
3. User's existing projects can be:
   - Migrated to organization (optional)
   - Kept as personal projects
4. Billing transitions:
   - Personal subscription can be cancelled
   - Organization subscription starts
   - Proration handled automatically

```python
@router.post("/organizations/migrate")
async def migrate_to_organization(
    migration_data: MigrationRequest,
    user: User = Depends(get_current_user)
):
    """Migrate user's personal account to organization"""
    
    # Create organization
    org = Organization(
        name=migration_data.organization_name,
        slug=migration_data.slug,
        created_by_id=user.id,
        plan='team',
        status='active'
    )
    await org.save()
    
    # Update user
    user.organization_id = org.id
    user.organization_role = 'owner'
    await user.save()
    
    # Optionally migrate projects
    if migration_data.migrate_projects:
        await Project.update_many(
            {'client_id': user.id},
            {'$set': {'organization_id': org.id}}
        )
    
    # Cancel personal subscription
    if user.client_data.subscription_id:
        stripe.Subscription.modify(
            user.client_data.subscription_id,
            cancel_at_period_end=True
        )
    
    return {
        'organization_id': str(org.id),
        'message': 'Migration successful'
    }
```

---

## 9. Pricing Strategy

### Competitive Analysis

| Competitor | Team Plan | Enterprise |
|------------|-----------|------------|
| **Competitor A** | $299/month (10 users) | Custom |
| **Competitor B** | $499/month (25 users) | Custom |
| **PeerTest Hub** | $199/month (20 users) | Custom |

### Value Proposition

**Why PeerTest Hub Team?**
- 20% lower cost than competitors
- More users included (20 vs 10-15)
- Modern, intuitive interface
- Flexible tester marketplace
- AI-powered test generation
- No lock-in, cancel anytime

### Upsell Strategy

1. **Starter → Pro**: Individual features (AI, priority support)
2. **Pro → Team**: Organization collaboration
3. **Team → Enterprise**: Custom features, SLA, dedicated support

### Volume Discounts

- 3-5 organizations: 10% discount
- 6-10 organizations: 15% discount
- 10+ organizations: 20% discount

(For resellers or enterprise holding companies)

---

## Implementation Timeline

### Month 1-2: Core Organization Features
- Database schema and models
- Organization CRUD API
- Member invitation system
- Basic RBAC implementation
- Billing integration

### Month 3: UI/UX
- Organization dashboard
- Member management interface
- Billing and usage pages
- Settings and configuration

### Month 4: Testing & Launch
- Internal testing with beta customers
- Documentation and help center
- Marketing materials
- Public launch

### Month 5-6: Iteration
- Collect feedback
- Add collaboration features
- Improve onboarding
- SSO preparation

---

## Success Metrics

### KPIs

**Adoption:**
- Number of organizations created
- Conversion rate: Individual → Team
- Average team size
- Retention rate (monthly/annual)

**Usage:**
- Jobs created per organization
- Active members per organization
- Collaboration features usage
- Support tickets per organization

**Revenue:**
- MRR from Team plans
- Enterprise deals closed
- Average contract value
- Churn rate

### Target Goals (Year 1)

- 50 organizations on Team plan
- 5 Enterprise customers
- $15k MRR from organizations
- 85% retention rate
- 4.5+ satisfaction score

---

## Assumptions and Risks

### Assumptions
1. **Teams of 5-20** are primary target
2. **Modern tech companies** adopt first
3. **Monthly billing** acceptable (vs annual contracts)
4. **Self-service onboarding** sufficient initially

### Risks
- **Slow adoption** if market prefers individual accounts
- **Feature parity** with established competitors
- **Complex migration** from individual to team
- **Support burden** increases with enterprise features

### Mitigation Strategies
- Offer **free trial** (30 days) for Team plan
- **Migration assistance** for larger teams
- **Gradual rollout** of complex features
- **Dedicated support** tier for Enterprise

---

## Next Steps

1. **Finalize organization data model**
2. **Implement core RBAC system**
3. **Build organization management UI**
4. **Set up Stripe subscriptions** for organizations
5. **Create documentation** and onboarding guides
6. **Recruit beta customers** (5-10 organizations)
7. **Test thoroughly** with beta group
8. **Launch publicly** with marketing campaign
9. **Monitor metrics** and iterate
10. **Plan SSO** and advanced features

