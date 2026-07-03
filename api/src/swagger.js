import swaggerJsdoc from 'swagger-jsdoc';

const options = {
definition: {
  openapi: '3.0.0',
    info: {
      title: 'Trip-Weave API',
      version: '1.0.0',
      description: 'API documentation for the Trip-Weave flight search service',
    },
    servers: [ { url: 'http://localhost:5500' } ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }], 
  
  },
  
  // Ensures Swagger reads your controller documentation
apis: ['./api/src/controllers/*.js'],
};

export const specs = swaggerJsdoc(options);