// import Razorpay from 'razorpay';
import crypto from 'crypto';
import Order from '../models/orderModel.js';
import { Product } from '../models/productModel.js';
import { v4 as uuidv4 } from 'uuid';

// undo the comment after get the razor pay/ any other payment gateway api keys we get
// const razorpay = new Razorpay({
//     key_id: process.env.RAZORPAY_KEY_ID,
//     key_secret: process.env.RAZORPAY_KEY_SECRET
// });

//CREATE ORDER
export const createOrder = async (req, res, next) => {
    try {
        const { customer, paymentMethod, items, notes, shipping = 0 } = req.body;
        
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Items must be an array with at least one item'
            });
        }

        // Validate and fetch products with server-side pricing
        const productIds = items.map(item => item.id);
        const products = await Product.find({ _id: { $in: productIds } });
        
        if (products.length !== productIds.length) {
            return res.status(400).json({
                success: false,
                message: 'One or more products not found'
            });
        }

        // Create order items with server-side pricing
        const orderItems = items.map(clientItem => {
            const serverProduct = products.find(p => p._id.toString() === clientItem.id);
            return {
                id: serverProduct._id.toString(),
                name: serverProduct.name,
                price: serverProduct.price, // Use server price
                quantity: Number(clientItem.quantity),
                imageUrl: serverProduct.imageUrl
            };
        });

        const normalizedPM = paymentMethod === 'COD' ? 'Cash on Delivery' : 'Online Payment';
        const orderId = `ORD-${uuidv4()}`;
        let newOrder;

        if (normalizedPM === 'Online Payment') {
            // Calculate total in paise (INR)
            const subtotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
            const tax = parseFloat((subtotal * 0.07).toFixed(2));
            const total = subtotal + tax + shipping;

            const rpOrder = await razorpay.orders.create({
                amount: Math.round(total * 100), // in paise
                currency: 'INR',
                receipt: orderId,
                notes: { orderId, customerEmail: customer.email }
            });

            newOrder = new Order({
                orderId,
                user: req.user._id,
                customer,
                items: orderItems,
                shipping,
                paymentMethod: normalizedPM,
                paymentStatus: 'Unpaid',
                razorpayOrderId: rpOrder.id,
                notes
            });

            await newOrder.save();
            return res.status(201).json({
                success: true,
                order: newOrder,
                razorpay: {
                    key: process.env.RAZORPAY_KEY_ID,
                    amount: rpOrder.amount,
                    currency: rpOrder.currency,
                    order_id: rpOrder.id,
                    name: 'Order Payment',
                    description: `Payment for ${orderId}`,
                    prefill: { name: customer.name, email: customer.email, contact: customer.phone },
                    notes: { orderId }
                }
            });
        }

        // COD ORDER
        newOrder = new Order({
            orderId,
            user: req.user._id,
            customer,
            items: orderItems,
            shipping,
            paymentMethod: normalizedPM,
            paymentStatus: 'Paid',
            notes
        });
        
        await newOrder.save();
        res.status(201).json({ 
            success: true,
            order: newOrder, 
            checkoutUrl: null 
        });

    } catch (error) {
        console.error('CreateOrder Error:', error);
        next(error);
    }
}

// VERIFY RAZORPAY PAYMENT
export const verifyRazorpayPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res.status(400).json({ message: 'Missing payment verification fields' });
        }

        const generatedSignature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generatedSignature !== razorpay_signature) {
            return res.status(400).json({ message: 'Invalid payment signature' });
        }

        const order = await Order.findOneAndUpdate(
            { razorpayOrderId: razorpay_order_id },
            { 
                paymentStatus: 'Paid',
                razorpayPaymentId: razorpay_payment_id,
                razorpaySignature: razorpay_signature
            },
            { new: true }
        );

        if (!order) return res.status(404).json({ message: 'Order not found' });

        res.json({ success: true, order });
    } catch (error) {
        console.error('VerifyPayment Error:', error);
        next(error);
    }
}

//GET ALL ORDERS
export const getOrders = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Validate pagination parameters
        if (page < 1 || limit < 1 || limit > 100) {
            return res.status(400).json({
                success: false,
                message: 'Invalid pagination parameters'
            });
        }

        const query = {};
        
        // If user is not admin, only show their orders
        if (req.user && req.user.role !== 'admin') {
            query.user = req.user._id;
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const total = await Order.countDocuments(query);
        const totalPages = Math.ceil(total / limit);

        res.json({
            success: true,
            orders,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        });
    } catch (error) {
        console.error('GetOrders Error:', error);
        next(error);
    }
}

//GET ORDERS BY ID
export const getOrderById = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id).lean();
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // If user is not admin, only allow access to their own orders
        if (req.user && req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        res.json({ success: true, order });
    } catch (error) {
        console.error('GetOrderById Error:', error);
        next(error);
    }
}

//UPDATE ORDER BY ID
export const updateOrder = async (req, res, next) => {  
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // If user is not admin, only allow access to their own orders
        if (req.user && req.user.role !== 'admin' && order.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        const allowed = ['status', 'paymentStatus', 'deliveryDate', 'notes', 'shipping'];
        const updateData = {};
        
        allowed.forEach(field => {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        });

        const updated = await Order.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).lean();

        res.json({ success: true, order: updated });
    } catch (error) {
        console.error('UpdateOrder Error:', error);
        next(error);
    }
}

//DELETE ORDER BY ID
export const deleteOrder = async (req, res, next) => {
    try {
        const order = await Order.findById(req.params.id);
        
        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: 'Order not found' 
            });
        }

        // Only admins can delete orders
        if (req.user && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        await Order.findByIdAndDelete(req.params.id);
        res.json({ 
            success: true,
            message: 'Order deleted successfully' 
        });
    } catch (error) {
        console.error('DeleteOrder Error:', error);
        next(error);
    }
}

// RAZORPAY WEBHOOK HANDLER
export const handleRazorpayWebhook = async (req, res, next) => {
    try {
        const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!webhookSecret) {
            return res.status(400).json({ message: 'Webhook secret not configured' });
        }

        const signature = req.headers['x-razorpay-signature'];
        const expected = crypto
            .createHmac('sha256', webhookSecret)
            .update(req.body)
            .digest('hex');

        if (expected !== signature) {
            return res.status(400).json({ message: 'Invalid signature' });
        }

        // Parse raw body JSON
        const payload = JSON.parse(req.body.toString());
        const event = payload.event;

        if (event === 'payment.captured' || event === 'order.paid') {
            const payment = payload.payload.payment ? payload.payload.payment.entity : null;
            const orderId = payment ? payment.order_id : payload.payload.order?.entity?.id;
            const paymentId = payment ? payment.id : null;

            if (orderId) {
                await Order.findOneAndUpdate(
                    { razorpayOrderId: orderId },
                    {
                        paymentStatus: 'Paid',
                        razorpayPaymentId: paymentId
                    }
                );
            }
        }

        res.json({ received: true });
    } catch (error) {
        console.error('Razorpay Webhook error:', error);
        next(error);
    }
};