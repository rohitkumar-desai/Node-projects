import {
    defaultMetadataStorage as classTransformerMetadataStorage
} from 'class-transformer/storage';
import { getFromContainer, MetadataStorage } from 'class-validator';
import { validationMetadatasToSchemas } from 'class-validator-jsonschema';
import { MicroframeworkLoader, MicroframeworkSettings } from 'microframework-w3tec';
import { getMetadataArgsStorage } from 'routing-controllers';
import { routingControllersToSpec } from 'routing-controllers-openapi';
import * as swaggerUi from 'swagger-ui-express';

import { env } from '../env';

export const swaggerLoader: MicroframeworkLoader = (settings: MicroframeworkSettings | undefined) => {
    if (settings && env.swagger.enabled) {
        const expressApp = settings.getData('express_app');

        const { validationMetadatas } = getFromContainer(
            MetadataStorage
        ) as any;

        const schemas = validationMetadatasToSchemas(validationMetadatas, {
            classTransformerMetadataStorage,
            refPointerPrefix: '#/components/schemas/',
        });

        const swaggerFile = routingControllersToSpec(
            getMetadataArgsStorage(),
            {},
            {
                components: {
                    schemas,
                },
            }
        );

        // Add npm infos to the swagger doc
        swaggerFile.info = {
            title: env.app.name,
            description: env.app.description,
            version: env.app.version,
        };

        swaggerFile.servers = [
            {
                url: `${env.app.schema}://${env.app.host}:${env.app.port}${env.app.routePrefix}`,
            },
        ];

        expressApp.use(
            env.swagger.route,
            swaggerUi.serve,
            swaggerUi.setup(swaggerFile)
        );

    }
};
