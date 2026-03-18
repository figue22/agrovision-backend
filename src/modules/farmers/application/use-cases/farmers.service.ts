import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Agricultor } from '@modules/farmers/domain/entities/agricultor.entity';
import { UpdateAgricultorDto } from '@modules/farmers/application/dto/update-agricultor.dto';

@Injectable()
export class FarmersService {
  constructor(
    @InjectRepository(Agricultor)
    private readonly agricultorRepository: Repository<Agricultor>,
  ) {}

  async findByUsuarioId(usuarioId: string): Promise<Agricultor> {
    const agricultor = await this.agricultorRepository.findOne({
      where: { usuario_id: usuarioId },
      relations: ['usuario'],
    });

    if (!agricultor) {
      throw new NotFoundException('Perfil de agricultor no encontrado');
    }

    return agricultor;
  }

  async findById(agricultorId: string): Promise<Agricultor> {
    const agricultor = await this.agricultorRepository.findOne({
      where: { agricultor_id: agricultorId },
      relations: ['usuario'],
    });

    if (!agricultor) {
      throw new NotFoundException('Agricultor no encontrado');
    }

    return agricultor;
  }

  async update(usuarioId: string, dto: UpdateAgricultorDto): Promise<Agricultor> {
    const agricultor = await this.findByUsuarioId(usuarioId);

    Object.assign(agricultor, {
      ...(dto.direccion !== undefined && { direccion: dto.direccion }),
      ...(dto.municipio !== undefined && { municipio: dto.municipio }),
      ...(dto.departamento !== undefined && { departamento: dto.departamento }),
      ...(dto.tamano_finca_ha !== undefined && { tamano_finca_ha: dto.tamano_finca_ha }),
    });

    return this.agricultorRepository.save(agricultor);
  }

  async findAll(): Promise<Agricultor[]> {
    return this.agricultorRepository.find({
      relations: ['usuario'],
    });
  }
}
