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
} from '@nestjs/common';
import { CourseService } from './course.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { Course } from './schemas/course.schema';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { Express } from 'express';
import { isValidObjectId } from 'mongoose';

@Controller('courses')
export class CourseController {
  constructor(private readonly courseService: CourseService) {}

  @Post('/create-course')
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async create(
    @Body() createCourseDto: CreateCourseDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<Course> {
    const attachments = files && Array.isArray(files) ? files.map(file => file.path) : [];
    return this.courseService.create({ ...createCourseDto, attachments });
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
  @UseInterceptors(FilesInterceptor('attachments', 10, {
    storage: diskStorage({
      destination: './uploads',
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, `${file.fieldname}-${uniqueSuffix}${extname(file.originalname)}`);
      },
    }),
  }))
  async update(
    @Param('id') id: string,
    @Body() updateCourseDto: UpdateCourseDto,
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<Course> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid course ID format');
    }
    const attachments = files && Array.isArray(files) ? files.map(file => file.path) : [];
    return this.courseService.update(id, { ...updateCourseDto, attachments });
  }

  @Delete(':id')
  async remove(@Param('id') id: string): Promise<void> {
    if (!isValidObjectId(id)) {
      throw new BadRequestException('Invalid course ID format');
    }
    return this.courseService.remove(id);
  }
}