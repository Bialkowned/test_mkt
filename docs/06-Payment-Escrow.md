# PeerTest Hub - Payment & Escrow Design

## Overview

This document details the payment processing and escrow system for PeerTest Hub, powered by **Stripe**. The system handles client payments, escrow management, and tester payouts with secure, compliant financial transactions.

**Payment Provider:** Stripe  
**Features:** Escrow, Stripe Connect for payouts, Subscription billing

---

## Table of Contents

1. [Payment Architecture](#1-payment-architecture)
2. [Stripe Integration Setup](#2-stripe-integration-setup)
3. [Client Payment Flow](#3-client-payment-flow)
4. [Escrow Lifecycle](#4-escrow-lifecycle)
5. [Tester Payout System](#5-tester-payout-system)
6. [Subscription & Membership Billing](#6-subscription--membership-billing)
7. [Dispute & Refund Handling](#7-dispute--refund-handling)
8. [Security & Compliance](#8-security--compliance)
9. [Webhooks](#9-webhooks)
10. [Error Handling](#10-error-handling)

---

## 1. Payment Architecture

### System Components

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│   Client    │────────▶│  PeerTest    │────────▶│   Stripe    │
│   (Payer)   │         │     Hub      │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
                               │
                               │ Escrow Hold
                               ▼
                        ┌──────────────┐
                        │   Escrow     │
                        │   Account    │
                        └──────────────┘
                               │
                               │ Payout (via Stripe Connect)
                               ▼
                        ┌─────────────┐
                        │   Tester    │
                        │  (Payee)    │
                        └─────────────┘
```

### Money Flow

1. **Job Creation**: Client creates job with budget
2. **Payment Authorization**: Stripe PaymentIntent created (not captured)
3. **Job Publication**: Payment captured and held in escrow
4. **Submission Approved**: Release funds to tester via Stripe Connect Transfer
5. **Platform Fee**: Deducted before transfer to tester

### Fee Structure

- **Platform Fee**: 15% of job budget
- **Stripe Processing Fee**: ~2.9% + $0.30 per transaction
- **Tester Receives**: 85% - Stripe fees

**Example Calculation:**
```
Job Budget: $100.00
Platform Fee (15%): $15.00
Tester Gross: $85.00
Stripe Fee (~3%): $2.55
Tester Net: $82.45
```

---

## 2. Stripe Integration Setup

### Backend Configuration

```python
# config.py
import stripe
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: str
    STRIPE_CONNECT_CLIENT_ID: str
    
    class Config:
        env_file = ".env"

settings = Settings()
stripe.api_key = settings.STRIPE_SECRET_KEY
```

### Initialize Stripe Service

```python
# services/payment_service.py
import stripe
from typing import Dict, Any
from models.escrow import EscrowTransaction
from models.user import User
from models.job import Job

class PaymentService:
    """Handles all Stripe payment operations"""
    
    def __init__(self):
        self.platform_fee_percentage = 15
    
    async def create_customer(self, user: User) -> str:
        """Create Stripe customer for client"""
        customer = stripe.Customer.create(
            email=user.email,
            name=user.full_name,
            metadata={
                'user_id': str(user.id),
                'role': user.role
            }
        )
        return customer.id
    
    async def create_setup_intent(self, customer_id: str) -> Dict[str, Any]:
        """Create SetupIntent for adding payment method"""
        setup_intent = stripe.SetupIntent.create(
            customer=customer_id,
            payment_method_types=['card']
        )
        return {
            'client_secret': setup_intent.client_secret,
            'setup_intent_id': setup_intent.id
        }
    
    async def attach_payment_method(
        self, 
        customer_id: str, 
        payment_method_id: str
    ) -> None:
        """Attach payment method to customer"""
        stripe.PaymentMethod.attach(
            payment_method_id,
            customer=customer_id
        )
        
        # Set as default
        stripe.Customer.modify(
            customer_id,
            invoice_settings={
                'default_payment_method': payment_method_id
            }
        )
```

### Frontend Stripe.js Setup

```tsx
// lib/stripe.ts
import { loadStripe } from '@stripe/stripe-js'

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
)
```

```tsx
// components/payments/AddPaymentMethodForm.tsx
import { useState } from 'react'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { stripePromise } from '@/lib/stripe'
import { apiClient } from '@/api/client'

const PaymentMethodForm = () => {
  const stripe = useStripe()
  const elements = useElements()
  const [loading, setLoading] = useState(false)
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    
    setLoading(true)
    
    try {
      // Create setup intent on backend
      const { data } = await apiClient.post('/payments/setup-intent')
      
      // Confirm card setup
      const { setupIntent, error } = await stripe.confirmCardSetup(
        data.client_secret,
        {
          payment_method: {
            card: elements.getElement(CardElement)!,
          }
        }
      )
      
      if (error) {
        throw error
      }
      
      // Attach payment method to customer
      await apiClient.post('/payments/payment-methods', {
        payment_method_id: setupIntent!.payment_method,
        set_as_default: true
      })
      
      alert('Payment method added successfully')
    } catch (error) {
      console.error(error)
      alert('Failed to add payment method')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <form onSubmit={handleSubmit}>
      <CardElement 
        options={{
          style: {
            base: {
              fontSize: '16px',
              color: '#424770',
              '::placeholder': { color: '#aab7c4' }
            }
          }
        }}
      />
      <button type="submit" disabled={!stripe || loading}>
        Add Payment Method
      </button>
    </form>
  )
}

export const AddPaymentMethodForm = () => (
  <Elements stripe={stripePromise}>
    <PaymentMethodForm />
  </Elements>
)
```

---

## 3. Client Payment Flow

### Step 1: Create Job (Draft)

**Client Action**: Creates job with budget  
**System Action**: Job saved in `draft` status

```python
# API endpoint
@router.post("/jobs")
async def create_job(job_data: JobCreate, user: User = Depends(get_current_user)):
    job = Job(
        **job_data.dict(),
        client_id=user.id,
        status="draft",
        total_budget_usd=job_data.budget_per_tester_usd * job_data.max_testers
    )
    await job.save()
    
    return {
        "job_id": str(job.id),
        "status": "draft",
        "total_budget_usd": job.total_budget_usd,
        "message": "Job created. Complete payment to publish."
    }
```

### Step 2: Publish Job with Payment

**Client Action**: Confirms payment to publish job  
**System Action**: Creates PaymentIntent and captures payment

```python
@router.post("/jobs/{job_id}/publish")
async def publish_job(
    job_id: str,
    payment_data: PublishJobRequest,
    user: User = Depends(get_current_user),
    payment_service: PaymentService = Depends()
):
    job = await Job.get(job_id)
    
    if job.status != "draft":
        raise HTTPException(400, "Job already published")
    
    # Create PaymentIntent
    payment_intent = stripe.PaymentIntent.create(
        amount=int(job.total_budget_usd * 100),  # Convert to cents
        currency='usd',
        customer=user.client_data.stripe_customer_id,
        payment_method=payment_data.payment_method_id,
        confirmation_method='manual',
        confirm=True,
        capture_method='automatic',  # Capture immediately
        metadata={
            'job_id': str(job.id),
            'client_id': str(user.id)
        }
    )
    
    if payment_intent.status != 'succeeded':
        raise HTTPException(402, "Payment failed")
    
    # Create escrow transaction
    escrow = EscrowTransaction(
        job_id=job.id,
        client_id=user.id,
        amount_usd=job.total_budget_usd,
        currency='usd',
        stripe_payment_intent_id=payment_intent.id,
        stripe_charge_id=payment_intent.charges.data[0].id,
        status='captured',
        platform_fee_percentage=15,
        platform_fee_usd=job.total_budget_usd * 0.15,
        stripe_fee_usd=payment_intent.charges.data[0].balance_transaction.fee / 100,
        events=[{
            'event_type': 'captured',
            'amount_usd': job.total_budget_usd,
            'timestamp': datetime.utcnow(),
            'performed_by': user.id
        }]
    )
    await escrow.save()
    
    # Update job
    job.status = 'open'
    job.published_at = datetime.utcnow()
    job.escrow_status = 'held'
    job.escrow_transaction_id = escrow.id
    await job.save()
    
    return {
        "job_id": str(job.id),
        "status": "open",
        "escrow_transaction_id": str(escrow.id),
        "message": "Job published successfully"
    }
```

---

## 4. Escrow Lifecycle

### Escrow States

```
draft → authorized → captured → held → released/refunded
         (optional)    (publish)  (active)  (completed/cancelled)
```

### State Transitions

#### 1. **Captured** (Job Published)
- Payment captured from client
- Funds held by platform
- Job becomes visible to testers

#### 2. **Held** (Job Active)
- Funds remain in platform account
- Testers can claim and work on job
- Awaiting submission approval

#### 3. **Released** (Submission Approved)
- Funds transferred to tester via Stripe Connect
- Platform fee retained
- Job marked complete when all slots filled

#### 4. **Refunded** (Job Cancelled)
- Partial or full refund to client
- Depends on work completed
- Dispute resolution may apply

### Escrow Management Code

```python
class EscrowService:
    """Manages escrow lifecycle"""
    
    async def release_to_tester(
        self,
        escrow: EscrowTransaction,
        submission_id: str,
        tester: User,
        amount_usd: float
    ) -> Dict[str, Any]:
        """Release escrow funds to tester"""
        
        if not tester.tester_data.stripe_connect_id:
            raise ValueError("Tester hasn't connected Stripe account")
        
        # Calculate amounts
        platform_fee = amount_usd * (escrow.platform_fee_percentage / 100)
        tester_amount = amount_usd - platform_fee
        
        # Create Stripe Transfer
        transfer = stripe.Transfer.create(
            amount=int(tester_amount * 100),  # Convert to cents
            currency='usd',
            destination=tester.tester_data.stripe_connect_id,
            transfer_group=f'job_{escrow.job_id}',
            metadata={
                'submission_id': submission_id,
                'tester_id': str(tester.id),
                'job_id': str(escrow.job_id)
            }
        )
        
        # Record payout in escrow
        payout_record = {
            'tester_id': tester.id,
            'submission_id': submission_id,
            'amount_usd': amount_usd,
            'platform_fee_usd': platform_fee,
            'tester_payout_usd': tester_amount,
            'stripe_transfer_id': transfer.id,
            'status': 'completed',
            'completed_at': datetime.utcnow()
        }
        
        escrow.payouts.append(payout_record)
        escrow.events.append({
            'event_type': 'released',
            'amount_usd': amount_usd,
            'timestamp': datetime.utcnow(),
            'notes': f'Payout to tester for submission {submission_id}'
        })
        
        # Update escrow status if all payouts complete
        if len(escrow.payouts) == escrow.job.max_testers:
            escrow.status = 'released'
        
        await escrow.save()
        
        # Update tester earnings
        tester.tester_data.total_earned_usd += tester_amount
        await tester.save()
        
        return payout_record
    
    async def refund_to_client(
        self,
        escrow: EscrowTransaction,
        amount_usd: float,
        reason: str
    ) -> Dict[str, Any]:
        """Refund escrow to client"""
        
        # Create Stripe Refund
        refund = stripe.Refund.create(
            charge=escrow.stripe_charge_id,
            amount=int(amount_usd * 100),
            reason='requested_by_customer',
            metadata={
                'job_id': str(escrow.job_id),
                'reason': reason
            }
        )
        
        escrow.events.append({
            'event_type': 'refunded',
            'amount_usd': amount_usd,
            'timestamp': datetime.utcnow(),
            'notes': reason
        })
        
        if refund.status == 'succeeded':
            escrow.status = 'refunded'
        
        await escrow.save()
        
        return {
            'refund_id': refund.id,
            'amount_usd': amount_usd,
            'status': refund.status
        }
```

---

## 5. Tester Payout System

### Stripe Connect Onboarding

**Flow**: Tester → PeerTest Hub → Stripe Connect Express

```python
@router.post("/users/me/stripe-connect")
async def setup_stripe_connect(user: User = Depends(require_tester)):
    """Generate Stripe Connect onboarding link"""
    
    account_link = stripe.AccountLink.create(
        account=user.tester_data.stripe_connect_id if user.tester_data.stripe_connect_id else None,
        refresh_url=f"{settings.FRONTEND_URL}/settings/payout?refresh=true",
        return_url=f"{settings.FRONTEND_URL}/settings/payout?success=true",
        type='account_onboarding',
        collect='eventually_due'
    )
    
    return {
        'stripe_connect_url': account_link.url
    }
```

### Frontend Stripe Connect

```tsx
// pages/TesterPayoutSettings.tsx
import { useState, useEffect } from 'react'
import { apiClient } from '@/api/client'
import { Button } from '@/components/ui/Button'

export const TesterPayoutSettings = () => {
  const [connectStatus, setConnectStatus] = useState<'none' | 'pending' | 'verified'>('none')
  const [loading, setLoading] = useState(false)
  
  useEffect(() => {
    // Check URL params for Stripe Connect return
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      setConnectStatus('verified')
    }
  }, [])
  
  const handleConnectStripe = async () => {
    setLoading(true)
    try {
      const { data } = await apiClient.post('/users/me/stripe-connect')
      window.location.href = data.stripe_connect_url
    } catch (error) {
      alert('Failed to start Stripe Connect setup')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <h2>Payout Settings</h2>
      
      {connectStatus === 'none' ? (
        <div>
          <p>Connect your bank account to receive payments</p>
          <Button onClick={handleConnectStripe} isLoading={loading}>
            Connect with Stripe
          </Button>
        </div>
      ) : connectStatus === 'verified' ? (
        <div className="bg-green-50 p-4 rounded">
          ✅ Payout method verified. You can receive payments.
        </div>
      ) : (
        <div className="bg-yellow-50 p-4 rounded">
          ⏳ Verification pending
        </div>
      )}
    </div>
  )
}
```

### Automatic Payout on Approval

```python
@router.post("/submissions/{submission_id}/approve")
async def approve_submission(
    submission_id: str,
    feedback_data: ApproveSubmissionRequest,
    user: User = Depends(get_current_user),
    escrow_service: EscrowService = Depends()
):
    submission = await Submission.get(submission_id)
    job = await Job.get(submission.job_id)
    tester = await User.get(submission.tester_id)
    escrow = await EscrowTransaction.get(job.escrow_transaction_id)
    
    # Update submission
    submission.status = 'approved'
    submission.client_feedback = feedback_data.feedback
    submission.payout_amount_usd = job.budget_per_tester_usd
    submission.payout_status = 'processing'
    await submission.save()
    
    # Process payout
    try:
        payout = await escrow_service.release_to_tester(
            escrow=escrow,
            submission_id=submission_id,
            tester=tester,
            amount_usd=job.budget_per_tester_usd
        )
        
        submission.payout_status = 'paid'
        submission.payout_date = datetime.utcnow()
        await submission.save()
        
        # Send notification
        await notification_service.send(
            user_id=tester.id,
            type='payment_received',
            title='Payment Received',
            message=f'You received ${payout["tester_payout_usd"]:.2f} for your submission'
        )
        
    except Exception as e:
        submission.payout_status = 'failed'
        await submission.save()
        raise HTTPException(500, f"Payout failed: {str(e)}")
    
    return {
        "submission_id": submission_id,
        "status": "approved",
        "payout_status": submission.payout_status
    }
```

---

## 6. Subscription & Membership Billing

### Membership Tiers

| Tier | Price | Features |
|------|-------|----------|
| **Starter** | Free | 5 jobs/month, Basic support |
| **Pro** | $49/month | Unlimited jobs, AI features, Priority support |
| **Team** | $199/month | Everything in Pro + Organization features, Team billing |

### Subscription Setup

```python
# Create subscription products (one-time setup)
SUBSCRIPTION_PRODUCTS = {
    'pro': {
        'price_id': 'price_1MvQeRCRhkTQzfJ5abc123',
        'amount': 4900,  # $49.00
    },
    'team': {
        'price_id': 'price_1MvQeRCRhkTQzfJ5xyz789',
        'amount': 19900,  # $199.00
    }
}

@router.post("/subscriptions/create")
async def create_subscription(
    subscription_data: CreateSubscriptionRequest,
    user: User = Depends(get_current_user)
):
    """Create subscription for user"""
    
    tier = subscription_data.tier  # 'pro' or 'team'
    
    subscription = stripe.Subscription.create(
        customer=user.client_data.stripe_customer_id,
        items=[{
            'price': SUBSCRIPTION_PRODUCTS[tier]['price_id']
        }],
        payment_behavior='default_incomplete',
        payment_settings={
            'save_default_payment_method': 'on_subscription'
        },
        expand=['latest_invoice.payment_intent'],
        metadata={
            'user_id': str(user.id),
            'tier': tier
        }
    )
    
    # Update user tier
    user.client_data.membership_tier = tier
    user.client_data.subscription_id = subscription.id
    await user.save()
    
    return {
        'subscription_id': subscription.id,
        'client_secret': subscription.latest_invoice.payment_intent.client_secret,
        'status': subscription.status
    }
```

### Cancel Subscription

```python
@router.post("/subscriptions/cancel")
async def cancel_subscription(user: User = Depends(get_current_user)):
    """Cancel subscription at period end"""
    
    subscription = stripe.Subscription.modify(
        user.client_data.subscription_id,
        cancel_at_period_end=True
    )
    
    return {
        'message': 'Subscription will cancel at end of billing period',
        'cancel_at': subscription.cancel_at
    }
```

---

## 7. Dispute & Refund Handling

### Dispute Scenarios

1. **Client disputes submission quality** → Admin reviews → Partial/full refund
2. **Tester disputes rejection** → Admin reviews → Release payment
3. **Job cancelled before completion** → Prorated refund

### Dispute-Triggered Refund

```python
async def resolve_dispute_with_refund(
    dispute: Dispute,
    resolution_type: str,
    refund_amount_usd: float
) -> Dict[str, Any]:
    """Handle dispute resolution with refund"""
    
    escrow = await EscrowTransaction.get(dispute.escrow_transaction_id)
    
    if resolution_type == 'full_refund':
        refund_amount = escrow.amount_usd
    elif resolution_type == 'partial_refund':
        refund_amount = refund_amount_usd
    else:
        return {'message': 'No refund required'}
    
    escrow_service = EscrowService()
    result = await escrow_service.refund_to_client(
        escrow=escrow,
        amount_usd=refund_amount,
        reason=f'Dispute resolution: {dispute.resolution}'
    )
    
    # Update dispute
    dispute.status = 'resolved'
    dispute.resolution_type = resolution_type
    await dispute.save()
    
    return result
```

---

## 8. Security & Compliance

### PCI Compliance

- **Never store card details** - Use Stripe.js to tokenize cards
- **Use Stripe Elements** for card input (PCI SAQ A compliant)
- **HTTPS only** for all payment pages

### Security Best Practices

```python
# 1. Validate webhook signatures
def verify_webhook_signature(payload: bytes, sig_header: str) -> Dict:
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
        return event
    except ValueError:
        raise HTTPException(400, "Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(400, "Invalid signature")

# 2. Idempotency for payment operations
async def process_payment_idempotent(job_id: str, payment_method_id: str):
    idempotency_key = f"job_{job_id}_publish"
    
    payment_intent = stripe.PaymentIntent.create(
        amount=...,
        currency='usd',
        payment_method=payment_method_id,
        idempotency_key=idempotency_key  # Prevent duplicate charges
    )

# 3. Rate limiting on payment endpoints
@router.post("/jobs/{job_id}/publish")
@limiter.limit("5/minute")  # Max 5 publish attempts per minute
async def publish_job(...):
    pass
```

### Data Encryption

```python
# Encrypt sensitive data in database
from cryptography.fernet import Fernet

class EncryptionService:
    def __init__(self):
        self.cipher = Fernet(settings.ENCRYPTION_KEY)
    
    def encrypt(self, data: str) -> str:
        return self.cipher.encrypt(data.encode()).decode()
    
    def decrypt(self, encrypted_data: str) -> str:
        return self.cipher.decrypt(encrypted_data.encode()).decode()

# Use for credentials in projects
project.credentials.password = encryption_service.encrypt(password)
```

---

## 9. Webhooks

### Stripe Webhook Endpoint

```python
@router.post("/webhooks/stripe")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    
    payload = await request.body()
    sig_header = request.headers.get('stripe-signature')
    
    event = verify_webhook_signature(payload, sig_header)
    
    # Handle event types
    handlers = {
        'payment_intent.succeeded': handle_payment_succeeded,
        'payment_intent.payment_failed': handle_payment_failed,
        'charge.refunded': handle_charge_refunded,
        'account.updated': handle_account_updated,
        'transfer.created': handle_transfer_created,
        'transfer.failed': handle_transfer_failed,
    }
    
    handler = handlers.get(event['type'])
    if handler:
        await handler(event['data']['object'])
    
    return {'status': 'success'}

async def handle_payment_succeeded(payment_intent):
    """Handle successful payment"""
    job_id = payment_intent['metadata']['job_id']
    # Update job status, send notifications, etc.

async def handle_transfer_failed(transfer):
    """Handle failed payout transfer"""
    submission_id = transfer['metadata']['submission_id']
    submission = await Submission.get(submission_id)
    submission.payout_status = 'failed'
    await submission.save()
    
    # Notify admin and tester
```

### Configure Webhook in Stripe Dashboard

1. Go to Stripe Dashboard → Developers → Webhooks
2. Add endpoint: `https://api.peertest.io/v1/webhooks/stripe`
3. Select events to listen for
4. Copy webhook secret to `.env`

---

## 10. Error Handling

### Payment Error Codes

```python
STRIPE_ERROR_MESSAGES = {
    'card_declined': 'Your card was declined. Please use a different payment method.',
    'insufficient_funds': 'Your card has insufficient funds.',
    'expired_card': 'Your card has expired. Please update your payment method.',
    'incorrect_cvc': 'Your card\'s security code is incorrect.',
    'processing_error': 'An error occurred while processing your card.',
    'rate_limit': 'Too many requests. Please try again later.',
}

@router.post("/jobs/{job_id}/publish")
async def publish_job(...):
    try:
        # Payment processing
        pass
    except stripe.error.CardError as e:
        # Card was declined
        error_code = e.error.code
        message = STRIPE_ERROR_MESSAGES.get(error_code, 'Payment failed')
        raise HTTPException(402, message)
    except stripe.error.RateLimitError:
        raise HTTPException(429, STRIPE_ERROR_MESSAGES['rate_limit'])
    except stripe.error.InvalidRequestError as e:
        raise HTTPException(400, str(e))
    except stripe.error.AuthenticationError:
        raise HTTPException(500, 'Payment system error')
    except stripe.error.StripeError:
        raise HTTPException(500, 'Payment processing failed')
```

### Retry Logic for Payouts

```python
async def release_to_tester_with_retry(
    escrow: EscrowTransaction,
    submission_id: str,
    tester: User,
    amount_usd: float,
    max_retries: int = 3
) -> Dict[str, Any]:
    """Release payment with automatic retry"""
    
    for attempt in range(max_retries):
        try:
            return await escrow_service.release_to_tester(
                escrow, submission_id, tester, amount_usd
            )
        except stripe.error.StripeError as e:
            if attempt == max_retries - 1:
                # Final attempt failed, notify admin
                await notification_service.notify_admin(
                    f'Payout failed after {max_retries} attempts: {str(e)}'
                )
                raise
            
            # Wait before retry (exponential backoff)
            await asyncio.sleep(2 ** attempt)
    
    raise Exception('Payout failed after all retries')
```

---

## Testing Strategy

### Test Mode

Use Stripe test cards for development:

```
# Successful card
Card Number: 4242 4242 4242 4242
Expiry: Any future date
CVC: Any 3 digits

# Declined card
Card Number: 4000 0000 0000 0002

# Insufficient funds
Card Number: 4000 0000 0000 9995
```

### Integration Tests

```python
# tests/test_payments.py
import pytest
from unittest.mock import patch, MagicMock

@pytest.mark.asyncio
async def test_publish_job_with_payment(client, test_user):
    """Test job publication with payment"""
    
    with patch('stripe.PaymentIntent.create') as mock_payment:
        mock_payment.return_value = MagicMock(
            status='succeeded',
            id='pi_test_123',
            charges=MagicMock(data=[MagicMock(
                id='ch_test_123',
                balance_transaction=MagicMock(fee=290)
            )])
        )
        
        response = await client.post(
            f"/jobs/{job_id}/publish",
            json={"payment_method_id": "pm_test_123"}
        )
        
        assert response.status_code == 200
        assert response.json()['status'] == 'open'
        assert response.json()['escrow_status'] == 'held'
```

---

## Assumptions and Alternatives

### Assumptions
1. **USD currency only** for MVP
2. **Stripe availability** in client/tester countries
3. **Bank accounts** for tester payouts (Stripe Connect Express)
4. **Immediate capture** of payments (no pre-authorization hold)

### Alternative Approaches
1. **PayPal** integration alongside Stripe
2. **Cryptocurrency** payments (future consideration)
3. **Wire transfers** for large organizations
4. **Multi-currency** support (V2)
5. **Split payments** (simultaneous payment to multiple testers)

### Future Enhancements
- **Subscription analytics** dashboard
- **Payment method management** UI
- **Invoice generation** for enterprise clients
- **Tax handling** (VAT, GST) for international clients
- **Payment plans** for large job budgets

---

## Next Steps

1. **Set up Stripe account** and obtain API keys
2. **Implement payment service** with escrow logic
3. **Create webhook endpoint** and test
4. **Integrate Stripe.js** in frontend
5. **Build Stripe Connect** onboarding flow
6. **Test thoroughly** with test cards
7. **Implement error handling** and retries
8. **Security audit** before production
9. **Enable production mode** on Stripe

