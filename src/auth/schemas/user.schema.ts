import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ collection: 'users' })
export class User {
  _id: Types.ObjectId; 

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: function() {
    // Make lastName required only if not using social login
    return !this.googleId; 
  }})
  lastName: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop() // Password is optional for cases like social login
  password?: string;

  @Prop({ required: true })
  userId: string;

  @Prop() 
  googleId?: string;

  @Prop({ default: 'user' })
  role: string;

  @Prop({ default: false }) 
  isEmailVerified: boolean;

  @Prop() 
  emailVerificationToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);