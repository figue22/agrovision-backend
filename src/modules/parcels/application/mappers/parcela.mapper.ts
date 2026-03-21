import { Parcela } from '@modules/parcels/domain/entities/parcela.entity';
import { ParcelaResponseDto } from '@modules/parcels/application/dto';
import { UbicacionDto } from '@modules/parcels/application/dto';

export class ParcelaMapper {
  static toResponseDto(parcela: Parcela): ParcelaResponseDto {
    const dto = new ParcelaResponseDto();
    dto.parcela_id = parcela.parcela_id;
    dto.agricultor_id = parcela.agricultor_id;
    dto.nombre = parcela.nombre;
    dto.area_hectareas = Number(parcela.area_hectareas);
    dto.tipo_suelo = parcela.tipo_suelo;
    dto.ph_suelo = parcela.ph_suelo ? Number(parcela.ph_suelo) : undefined;
    dto.altitud_msnm = parcela.altitud_msnm;
    dto.limites_geojson = parcela.limites_geojson;
    dto.creado_en = parcela.creado_en;
    dto.actualizado_en = parcela.actualizado_en;

    const ubicacion = parcela.ubicacion as { type: string; coordinates: number[] } | null;
    if (ubicacion && ubicacion.coordinates) {
      dto.ubicacion = {
        latitud: ubicacion.coordinates[1],
        longitud: ubicacion.coordinates[0],
      };
    }

    // Incluir datos del agricultor si la relación fue cargada
    if (parcela.agricultor) {
      dto.agricultor = {
        agricultor_id: parcela.agricultor.agricultor_id,
        cedula: parcela.agricultor.cedula,
        municipio: parcela.agricultor.municipio,
        departamento: parcela.agricultor.departamento,
        usuario: parcela.agricultor.usuario
          ? {
              nombre: parcela.agricultor.usuario.nombre,
              apellido: parcela.agricultor.usuario.apellido,
              correo: parcela.agricultor.usuario.correo,
            }
          : undefined,
      };
    }

    return dto;
  }

  static ubicacionToGeoJSON(ubicacion: UbicacionDto): object {
    return {
      type: 'Point',
      coordinates: [ubicacion.longitud, ubicacion.latitud],
    };
  }

  static toResponseList(parcelas: Parcela[]): ParcelaResponseDto[] {
    return parcelas.map((p) => this.toResponseDto(p));
  }
}