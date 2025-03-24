import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CourseDocument = Course & Document;

@Schema()
export class Attachment {
  @Prop({ type: Types.ObjectId, default: () => new Types.ObjectId() })
  _id: Types.ObjectId;

  @Prop({ required: true })
  url: string;

  @Prop()
  publicId: string;

  @Prop()
  fileName: string;
}

@Schema({ timestamps: true })
export class Course {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  description: string;

  @Prop({ required: true })
  category: string;

  @Prop({ required: true, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' })
  level: string;

  @Prop({ default: 0 })
  price: number;

  @Prop()
  imageUrl: string;

  @Prop()
  imagePublicId: string;

  @Prop({ required: true })
  createdBy: string;

  @Prop({ type: [Attachment], default: [] })
  attachments: Attachment[];
}

export const CourseSchema = SchemaFactory.createForClass(Course);