import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Course, CourseDocument } from './schemas/course.schema';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException } from '@nestjs/common';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';




@Injectable()
export class CourseService {
  constructor(
    @InjectModel(Course.name) private courseModel: Model<CourseDocument>,
    private cloudinaryService: CloudinaryService,
  ) {}

  async create(createCourseDto: CreateCourseDto, files: Express.Multer.File[]): Promise<Course> {
    const uploadPromises = files.map(file => this.cloudinaryService.uploadFile(file));
    const uploadResults = await Promise.all(uploadPromises);
    
    const attachments = uploadResults.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      fileName: result.original_filename,
    }));
    
    let imageUrl: string | null = null;
    let imagePublicId: string | null = null;
    
    if (createCourseDto.courseImage && typeof createCourseDto.courseImage === 'object') {
      const imageUploadResult = await this.cloudinaryService.uploadFile(createCourseDto.courseImage);
      imageUrl = imageUploadResult.secure_url;
      imagePublicId = imageUploadResult.public_id;
    }
    
    const course = new this.courseModel({
      ...createCourseDto,
      attachments,
      imageUrl,
      imagePublicId,
    });
    
    return course.save();
  }

  async findAll(): Promise<Course[]> {
    return this.courseModel.find().exec();
  }

  async findOne(id: string): Promise<Course> {
    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    return course;
  }

  async update(id: string, updateCourseDto: UpdateCourseDto, files: Express.Multer.File[]): Promise<Course> {
    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    
    // Upload new attachments
    const uploadPromises = files.map(file => this.cloudinaryService.uploadFile(file));
    const uploadResults = await Promise.all(uploadPromises);
    
    const newAttachments = uploadResults.map(result => ({
      url: result.secure_url,
      publicId: result.public_id,
      fileName: result.original_filename,
    }));
    
    // Handle course image update if needed
    let imageUrl = course.imageUrl;
    let imagePublicId = course.imagePublicId;
    
    if (updateCourseDto.courseImage && typeof updateCourseDto.courseImage === 'object') {
      // Delete previous image if exists
      if (course.imagePublicId) {
        await this.cloudinaryService.deleteFile(course.imagePublicId);
      }
      
      const imageUploadResult = await this.cloudinaryService.uploadFile(updateCourseDto.courseImage);
      imageUrl = imageUploadResult.secure_url;
      imagePublicId = imageUploadResult.public_id;
    }
    
    // Combine existing and new attachments
    const attachments = [...(course.attachments || []), ...newAttachments];
    
    const updatedCourse = await this.courseModel.findByIdAndUpdate(
      id,
      { ...updateCourseDto, attachments, imageUrl, imagePublicId },
      { new: true }
    ).exec();

    if (!updatedCourse) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }

    return updatedCourse;
  }

  async updateCourseImage(id: string, file: Express.Multer.File): Promise<Course> {
    // Find the course by ID
    const course = await this.courseModel.findById(id);
    
    if (!course) {
      throw new BadRequestException('Course not found');
    }
  
    // Upload the new image to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(file);
  
    // Update the course image fields
    course.imageUrl = uploadResult.secure_url; // Use the secure URL from Cloudinary
    course.imagePublicId = uploadResult.public_id; // Store the public ID for future reference
  
    // Save the updated course
    return await course.save();
  }

  async remove(id: string): Promise<void> {
    const course = await this.courseModel.findById(id).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${id} not found`);
    }
    
    // Delete all attachments from Cloudinary
    const deletePromises: Promise<void>[] = [];
    if (course.attachments && course.attachments.length > 0) {
      course.attachments.forEach(attachment => {
        if (attachment.publicId) {
          deletePromises.push(this.cloudinaryService.deleteFile(attachment.publicId));
        }
      });
    }
    
    // Delete course image if exists
    if (course.imagePublicId) {
      deletePromises.push(this.cloudinaryService.deleteFile(course.imagePublicId));
    }
    
    await Promise.all(deletePromises);
    await this.courseModel.findByIdAndDelete(id).exec();
  }
  
  async removeAttachment(courseId: string, attachmentId: string): Promise<Course> {
    const course = await this.courseModel.findById(courseId).exec();
    if (!course) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
  
    // Find the attachment using proper ObjectId comparison
    const attachment = course.attachments.find(a => 
      a._id && a._id.toString() === attachmentId
    );
  
    if (!attachment) {
      throw new NotFoundException(`Attachment with ID ${attachmentId} not found`);
    }
  
    // Delete from Cloudinary
    if (attachment.publicId) {
      await this.cloudinaryService.deleteFile(attachment.publicId);
    }
  
    // Remove from database using proper ObjectId conversion
    const updatedCourse = await this.courseModel.findByIdAndUpdate(
      courseId,
      { $pull: { attachments: { _id: new Types.ObjectId(attachmentId) } } },
      { new: true }
    ).exec();
  
    if (!updatedCourse) {
      throw new NotFoundException(`Course with ID ${courseId} not found`);
    }
  
    return updatedCourse;
  }
}