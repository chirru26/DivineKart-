import sendEmail from '../config/sendmail.js'
import User from "../models/userModel.js";
import validator from "validator";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// import verifyEmailTemplate from '../utils/verifyEmailTemplate.js'
import generatedAccessToken from '../utils/generatedAccessToken.js'
// import genertedRefreshToken from '../utils/generatedRefreshToken.js'
// import uploadImageClodinary from '../utils/uploadImageClodinary.js'
import generatedOtp from '../utils/generatedOtp.js'
import forgotPasswordTemplate from '../utils/forgotPasswordTemplate.js'




const JWT_SECRET = process.env.JWT_SECRET;
const TOKEN_EXPIRE = '48h';

const generateToken = (userId) => 
    jwt.sign({id: userId}, JWT_SECRET, {expiresIn: TOKEN_EXPIRE})


// Create a new user
export async function createUser(req, res) {
  const { name, email, password } = req.body;
  
  // Input sanitization
  const sanitizedName = validator.escape((name ?? '').trim());
  const sanitizedEmail = email?.trim().toLowerCase() || '';
  
  // Validate allowed characters for name
  const nameRegex = /^[\p{L}\p{N} .'\-]{1,100}$/u;
  if (!sanitizedName || !sanitizedEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "All fields are required",
    })
  }
  
  if (!nameRegex.test(sanitizedName)) {
    return res.status(400).json({
      success: false,
      message: "Name contains invalid characters",
    })
  }
  
  if (!validator.isEmail(sanitizedEmail)) {
    return res.status(400).json({
        success: false,
        message: "Invalid email format",
    })
  }
  
  // Enhanced password validation
  const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!passwordRegex.test(password)) {
    return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)",
    })
  }
  
  try {
    // Fix race condition by relying on MongoDB unique index
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ 
        name: sanitizedName, 
        email: sanitizedEmail, 
        password: hashed
     })
     const token = generateToken(user._id);
        res.status(201).json({
            success: true,
            token,
            user: {id: user._id, name: user.name, email: user.email}
        })

}
catch (error) {
  console.error(error);
  
  // Handle duplicate key error (MongoDB unique index violation)
  if (error.code === 11000) {
    return res.status(400).json({
        success: false,
        message: "Email already registered",
    })
  }
  
  res.status(500).json({
    success: false,
    message: "Server Error",
  })
}

}

// Login a user
export async function loginUser(req, res) {
  const { email, password } = req.body;

  // Input sanitization
  const sanitizedEmail = email?.trim().toLowerCase() || '';

  if (!sanitizedEmail || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    })
  }

try {
    const user = await User.findOne({email: sanitizedEmail})
    if (!user) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        })
    }
    const match = await bcrypt.compare(password, user.password)
    if (!match) {
        return res.status(401).json({
            success: false,
            message: "Invalid email or password",
        })
    }
    const token = generateToken(user._id);
    res.json({
        success: true,
        token,
        user: {id: user._id, name: user.name, email: user.email}
    })  
  
}
catch (error) {
  console.error(error);
      res.status(500).json({
        success: false,
        message: "Server Error",
      })
}

}


//update user details
export async function updateUserDetails(request,response){
    try {
        const userId = request.userId //auth middleware
        const { name, email, mobile, password } = request.body 

        let hashPassword = ""

        if(password){
            const salt = await bcryptjs.genSalt(10)
            hashPassword = await bcryptjs.hash(password,salt)
        }

        const updateUser = await UserModel.updateOne({ _id : userId},{
            ...(name && { name : name }),
            ...(email && { email : email }),
            ...(mobile && { mobile : mobile }),
            ...(password && { password : hashPassword })
        })

        return response.json({
            message : "Updated successfully",
            error : false,
            success : true,
            data : updateUser
        })


    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//forgot password not login
export async function forgotPasswordController(request,response) {
    try {
        const { email } = request.body 

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email not available",
                error : true,
                success : false
            })
        }

        const otp = generatedOtp()
        const expireTime = new Date() + 60 * 60 * 1000 // 1hr

        const update = await UserModel.findByIdAndUpdate(user._id,{
            forgot_password_otp : otp,
            forgot_password_expiry : new Date(expireTime).toISOString()
        })

        await sendEmail({
            sendTo : email,
            subject : "Forgot password from Binkeyit",
            html : forgotPasswordTemplate({
                name : user.name,
                otp : otp
            })
        })

        return response.json({
            message : "check your email",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//verify forgot password otp
export async function verifyForgotPasswordOtp(request,response){
    try {
        const { email , otp }  = request.body

        if(!email || !otp){
            return response.status(400).json({
                message : "Provide required field email, otp.",
                error : true,
                success : false
            })
        }

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email not available",
                error : true,
                success : false
            })
        }

        const currentTime = new Date().toISOString()

        if(user.forgot_password_expiry < currentTime  ){
            return response.status(400).json({
                message : "Otp is expired",
                error : true,
                success : false
            })
        }

        if(otp !== user.forgot_password_otp){
            return response.status(400).json({
                message : "Invalid otp",
                error : true,
                success : false
            })
        }

        //if otp is not expired
        //otp === user.forgot_password_otp

        const updateUser = await UserModel.findByIdAndUpdate(user?._id,{
            forgot_password_otp : "",
            forgot_password_expiry : ""
        })
        
        return response.json({
            message : "Verify otp successfully",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//reset the password
export async function resetpassword(request,response){
    try {
        const { email , newPassword, confirmPassword } = request.body 

        if(!email || !newPassword || !confirmPassword){
            return response.status(400).json({
                message : "provide required fields email, newPassword, confirmPassword"
            })
        }

        const user = await UserModel.findOne({ email })

        if(!user){
            return response.status(400).json({
                message : "Email is not available",
                error : true,
                success : false
            })
        }

        if(newPassword !== confirmPassword){
            return response.status(400).json({
                message : "newPassword and confirmPassword must be same.",
                error : true,
                success : false,
            })
        }

        const salt = await bcryptjs.genSalt(10)
        const hashPassword = await bcryptjs.hash(newPassword,salt)

        const update = await UserModel.findOneAndUpdate(user._id,{
            password : hashPassword
        })

        return response.json({
            message : "Password updated successfully.",
            error : false,
            success : true
        })

    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}


//refresh token controler
export async function refreshToken(request,response){
    try {
        const refreshToken = request.cookies.refreshToken || request?.headers?.authorization?.split(" ")[1]  /// [ Bearer token]

        if(!refreshToken){
            return response.status(401).json({
                message : "Invalid token",
                error  : true,
                success : false
            })
        }

        const verifyToken = await jwt.verify(refreshToken,process.env.SECRET_KEY_REFRESH_TOKEN)

        if(!verifyToken){
            return response.status(401).json({
                message : "token is expired",
                error : true,
                success : false
            })
        }

        const userId = verifyToken?._id

        const newAccessToken = await generatedAccessToken(userId)

        const cookiesOption = {
            httpOnly : true,
            secure : true,
            sameSite : "None"
        }

        response.cookie('accessToken',newAccessToken,cookiesOption)

        return response.json({
            message : "New Access token generated",
            error : false,
            success : true,
            data : {
                accessToken : newAccessToken
            }
        })


    } catch (error) {
        return response.status(500).json({
            message : error.message || error,
            error : true,
            success : false
        })
    }
}

//get login user details
export async function userDetails(request,response){
    try {
        const userId  = request.userId

        console.log(userId)

        const user = await UserModel.findById(userId).select('-password -refresh_token')

        return response.json({
            message : 'user details',
            data : user,
            error : false,
            success : true
        })
    } catch (error) {
        return response.status(500).json({
            message : "Something is wrong",
            error : true,
            success : false
        })
    }
}