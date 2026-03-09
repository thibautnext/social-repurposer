import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature') || ''

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch (err) {
    return NextResponse.json(
      { error: 'Webhook signature verification failed' },
      { status: 400 }
    )
  }

  // Handle different event types
  switch (event.type) {
    case 'customer.subscription.created':
      // Handle new subscription
      console.log('New subscription:', (event.data.object as Stripe.Subscription).id)
      break

    case 'customer.subscription.updated':
      // Handle subscription update
      console.log('Subscription updated:', (event.data.object as Stripe.Subscription).id)
      break

    case 'customer.subscription.deleted':
      // Handle subscription cancellation
      console.log('Subscription cancelled:', (event.data.object as Stripe.Subscription).id)
      break

    case 'invoice.payment_succeeded':
      // Handle successful payment
      console.log('Payment succeeded:', (event.data.object as Stripe.Invoice).id)
      break

    case 'invoice.payment_failed':
      // Handle failed payment
      console.log('Payment failed:', (event.data.object as Stripe.Invoice).id)
      break

    default:
      console.log(`Unhandled event type: ${event.type}`)
  }

  return NextResponse.json({ received: true })
}
