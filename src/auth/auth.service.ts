import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { SignUpDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { v4 as uuidv4 } from 'uuid'; 
import { CurrentUserDto } from './dto/current-user.dto'; 

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name)
    private userModel: Model<User>,
    private jwtService: JwtService,
  ) {}

  async signUp(signUpDto: SignUpDto): Promise<string> {
    const { firstName, lastName, email, password } = signUpDto;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      userId: uuidv4(), // Generate a unique userId
    });

    const token = this.createToken(user._id.toString()); // Ensure user._id is a string

    return token; 
  }

  async login(loginDto: LoginDto): Promise<string> {
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordMatched = await bcrypt.compare(password, user.password);

    if (!isPasswordMatched) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const token = this.createToken(user._id.toString()); // Ensure user._id is a string

    return token; 
  }

  createToken(userId: string): string {
    return this.jwtService.sign({ id: userId }); // Token generation logic
  }

  async getCurrentUser(userId: string): Promise<CurrentUserDto> {
    const user = await this.userModel.findById(userId).select('-password'); 
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      userId: user.userId,
      role: user.role,
    };
  }

  async validateUserByGoogle(profile: any): Promise<string> {
    let user: User | null = await this.userModel.findOne({ googleId: profile.id });

    if (!user) {
      user = await this.userModel.create({
        firstName: profile.name.givenName,
        lastName: profile.name.familyName,
        email: profile.emails[0].value,
        googleId: profile.id,
        userId: uuidv4(),
      });
    }

    return this.createToken(user._id.toString()); // Ensure user._id is a string
  }
}