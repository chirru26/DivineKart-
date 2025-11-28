import { Resend } from 'resend';
import dotenv from 'dotenv'
dotenv.config()

let resend;

if(!process.env.RESEND_API){
    console.warn("⚠️ RESEND_API not found in .env file - Email functionality will be disabled")
} else {
    resend = new Resend(process.env.RESEND_API);
}

const sendEmail = async({sendTo, subject, html })=>{
    try {
        if (!resend) {
            console.error("❌ Resend is not configured. Add RESEND_API to your .env file");
            return null;
        }

        const { data, error } = await resend.emails.send({
            from: 'DivineKart <noreply@divinekart.com>',
            to: sendTo,
            subject: subject,
            html: html,
        });

        if (error) {
            return console.error({ error });
        }

        return data
    } catch (error) {
        console.log(error)
    }
}

export default sendEmail