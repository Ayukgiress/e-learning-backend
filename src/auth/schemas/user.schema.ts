import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users' })
export class User {
  _id: Types.ObjectId; 

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true }) // Ensure unique email addresses
  email: string;

  @Prop() // Password is optional for cases like social login
  password?: string;

  @Prop({ required: true })
  userId: string; // Unique identifier for the user

  @Prop() 
  googleId?: string;

  @Prop({ default: 'user' }) // Default role for new users
  role: string;

  @Prop({ default: false }) 
  isEmailVerified: boolean;

  @Prop() 
  emailVerificationToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);