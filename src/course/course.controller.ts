import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  UseInterceptors,
  UploadedFiles,
  BadRequestException,
  UploadedFile,
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './schemas/course.schema';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { isValidObjectId } from 'mongoose';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post('/create-course')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<Course> {
    return this.courseService.create(createCourseDto, files || []);
  }

  @Post('/upload-course-image/:id')
  @UseInterceptors(FileInterceptor('image'))
  async uploadCourseImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<Course> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid course ID format');
    }
    return this.courseService.updateCourseImage(id, file);
  }

  @Get()
  async findAll(): Promise<Course[]> {
    return this.courseService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<Course> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid course ID format');
    }
    return this.courseService.findOne(id);
  }

  @Put(':id')
  @UseInterceptors(FilesInterceptor('attachments', 10))
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<Course> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid course ID format');
    }
    return this.courseService.update(id, updateCourseDto, files || []);
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid course ID format');
    }
    return this.courseService.remove(id);
  }
  
  @Delete(':courseId/attachments/:attachmentId')
  async removeAttachment(
    @Param('courseId') courseId: string,
    @Param('attachmentId') attachmentId: string,
  ): Promise<Course> {
    if (!isValidObjectId(courseId) || !isValidObjectId(attachmentId)) {
      throw new BadRequestException('Invalid ID format');
    }
    return this.courseService.removeAttachment(courseId, attachmentId);
  }
}