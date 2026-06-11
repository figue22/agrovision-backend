import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface PredictionMLRequest {
    parcela_id: string;
    cultivo_parcela_id: string;
    tipo_cultivo_id: string;
    modelo?: 'xgboost' | 'lstm' | 'ensemble';
    datos_agronomicos: {
        cultivo: string;
        departamento?: string;
        tipo_suelo?: string;
        ph_suelo?: number;
        altitud_msnm?: number;
        temp_promedio_c?: number;
        temp_maxima_c?: number;
        temp_minima_c?: number;
        precipitacion_mm_90d?: number;
        humedad_promedio_pct?: number;
        dias_sin_lluvia?: number;
        velocidad_viento_ms?: number;
        radiacion_solar_kwh?: number;
        area_sembrada_ha?: number;
        dias_desde_siembra?: number;
        fecha_siembra?: string;
        variedad?: string;
        nivel_fertilizacion?: number;
        tiene_riego?: number;
        nivel_control_plagas?: number;
        materia_organica_pct?: number;
        nitrogeno_ppm?: number;
        fosforo_ppm?: number;
        potasio_meq?: number;
        tipo_labranza?: string;
        densidad_siembra_rel?: number;
        datos_clima?: object[];
    };
}

export interface PredictionMLResponse {
    parcela_id: string;
    cultivo_parcela_id: string;
    tipo_cultivo_id: string;
    version_modelo: string;
    tipo_modelo: string;
    rendimiento_predicho_ton: number;
    puntaje_confianza: number;
    intervalo_conf_inferior: number;
    intervalo_conf_superior: number;
    nivel_riesgo: string;
    factores_riesgo: object;
    datos_clima_usados: object;
    importancia_features: object;
    fecha_prediccion: string;
    fecha_cosecha_estimada?: string;
    dias_para_cosecha?: number;
}

@Injectable()
export class MlService {
    private readonly logger = new Logger(MlService.name);
    private readonly mlUrl: string;

    constructor(private readonly configService: ConfigService) {
        this.mlUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
    }

    async predict(request: PredictionMLRequest): Promise<PredictionMLResponse> {
        try {
            const response = await axios.post<PredictionMLResponse>(
                `${this.mlUrl}/predict`,
                request,
                { timeout: 30000 },
            );
            return response.data;
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : String(err);
            this.logger.error(`Error llamando al servicio ML: ${msg}`);
            throw new Error(`Servicio ML no disponible: ${msg}`);
        }
    }

    async getModels(): Promise<object> {
        try {
            const response = await axios.get(`${this.mlUrl}/models`, { timeout: 5000 });
            return response.data;
        } catch {
            return { modelos: [], error: 'Servicio ML no disponible' };
        }
    }

    async healthCheck(): Promise<boolean> {
        try {
            await axios.get(`${this.mlUrl}/health`, { timeout: 3000 });
            return true;
        } catch {
            return false;
        }
    }
}