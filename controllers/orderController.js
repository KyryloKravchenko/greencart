import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Stripe from "stripe";
import User from "../models/User.js"

// === PLACE ORDER: COD ===
export const placeOrderCOD = async (req, res) => {
  try {
    const { items, address } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.json({ success: false, message: "Not authorized" });
    }

    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }

    // Calculate amount
    let amount = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.json({ success: false, message: "Product not found" });
      }
      amount += product.offerPrice * item.quantity;
    }

    // Add tax (2%)
    amount += Math.floor(amount * 0.02);

    await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "COD",
    });

    return res.json({
      success: true,
      message: "Order placed successfully",
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// === PLACE ORDER: STRIPE ===
export const placeOrderStripe = async (req, res) => {
  try {
    const { items, address } = req.body;
    const userId = req.user?._id;
    const { origin } = req.headers;

    if (!userId) {
      return res.json({ success: false, message: "Not authorized" });
    }

    if (!address || !items || items.length === 0) {
      return res.json({ success: false, message: "Invalid data" });
    }

    const productData = [];
    let amount = 0;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) {
        return res.json({ success: false, message: "Product not found" });
      }

      productData.push({
        name: product.name,
        price: product.offerPrice,
        quantity: item.quantity,
      });

      amount += product.offerPrice * item.quantity;
    }

    // Add tax
    amount += Math.floor(amount * 0.02);

    const order = await Order.create({
      userId,
      items,
      amount,
      address,
      paymentType: "ONLINE",
    });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    const line_items = productData.map((item) => ({
      price_data: {
        currency: "usd",
        product_data: { name: item.name },
        unit_amount: Math.floor(item.price + item.price * 0.02) * 100,
      },
      quantity: item.quantity,
    }));

    const session = await stripe.checkout.sessions.create({
      line_items,
      mode: "payment",
      success_url: `${origin}/loader?next=my-orders`,
      cancel_url: `${origin}/cart`,
      metadata: {
        orderId: order._id.toString(),
        userId: userId.toString(),
      },
    });

    return res.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

//sTRIPE WEBHOOKS TO VERIFY PAYMENTS ACTION: /stripe 

export const stripeWebhooks = async (req, res) => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body, 
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("Webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // основной обработчик
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;

    const { orderId, userId } = session.metadata;

    try {
      console.log("Order paid. ID:", orderId);

      await Order.findByIdAndUpdate(orderId, { isPaid: true });

      await User.findByIdAndUpdate(userId, { cartItems: {} });
    } catch (err) {
      console.error("DB error:", err.message);
      return res.status(500).send("Server error");
    }
  }

  return res.json({ received: true });
};


// === GET USER ORDERS ===
export const getUserOrders = async (req, res) => {
  try {
    const userId = req.user?._id;

    if (!userId) {
      return res.json({ success: false, message: "Not authorized" });
    }

    const orders = await Order.find({ userId })
      .populate("items.product address")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};

// === GET ALL ORDERS ===
export const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({})
      .populate("items.product address")
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      orders,
    });
  } catch (error) {
    return res.json({
      success: false,
      message: error.message,
    });
  }
};
