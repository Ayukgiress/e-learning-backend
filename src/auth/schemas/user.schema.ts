import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class User extends Document {
  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true, unique: true, lowercase: true }) // Ensure email is stored in lowercase
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop()
  googleId?: string; // Optional field

  @Prop({ default: 'user' }) // Default role
  role?: string;

  @Prop({ required: true, unique: true }) // Ensure to define the type
  userId: string; // Adjust the type based on your application's needs
}

export const UserSchema = SchemaFactory.createForClass(User);