/* eslint-disable no-useless-catch */
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as Bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import { UserRoleUpdateDto } from './dto/user_role_update.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './entities/user.entity';

dotenv.config();

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private readonly _userRepo: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      this.logger.log(`Creating new user: ${createUserDto.username}`);
      const user = await this._userRepo.findOne({
        where: { username: createUserDto.username },
      });
      if (user) {
        throw new BadRequestException(
          'User is already present with given username',
        );
      }
      const hashedPassword = await Bcrypt.hash(createUserDto.password, 12);
      const newUser = this._userRepo.create({
        ...createUserDto,
        password: hashedPassword,
      });
      return await this._userRepo.save(newUser);
    } catch (error) {
      this.logger.error(
        `Failed to create user: ${createUserDto.username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async updateUserRole(id: number, userRole: UserRoleUpdateDto) {
    try {
      const user = await this._userRepo.findOne({
        where: {
          id,
        },
      });
      if (!user) {
        throw new NotFoundException('User not found!');
      }
      user.role = userRole.role;
      await this._userRepo.save(user);
      return { message: 'User role updated successfully!' };
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this._userRepo.find();
    } catch (error) {
      this.logger.error(
        'Failed to fetch users',
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findOne(id: number): Promise<User> {
    try {
      const user = await this._userRepo.findOne({ where: { id } });
      if (!user) {
        this.logger.warn(`User not found with ID: ${id}`);
        throw new NotFoundException(`User with ID ${id} not found`);
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async findByUsername(username: string): Promise<User> {
    try {
      const user = await this._userRepo.findOne({ where: { username } });
      if (!user) {
        this.logger.warn(`User not found with username: ${username}`);
        throw new NotFoundException(`User with username ${username} not found`);
      }
      return user;
    } catch (error) {
      this.logger.error(
        `Failed to fetch user with username: ${username}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      const user = await this.findOne(id);
      const updatedUser = await this._userRepo.save({
        ...user,
        ...updateUserDto,
      });

      this.logger.log(`Successfully updated user with ID: ${id}`);
      return updatedUser;
    } catch (error) {
      this.logger.error(
        `Failed to update user with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const user = await this.findOne(id);
      await this._userRepo.remove(user);
      this.logger.log(`Successfully removed user with ID: ${id}`);
    } catch (error) {
      this.logger.error(
        `Failed to remove user with ID: ${id}`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }
}
