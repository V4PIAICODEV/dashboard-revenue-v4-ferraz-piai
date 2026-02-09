# Usa uma imagem leve do Nginx
FROM nginx:alpine

# Copia os arquivos do seu projeto para a pasta pública do Nginx
COPY . /usr/share/nginx/html

# Expõe a porta 80
EXPOSE 80

# Inicia o Nginx
CMD ["nginx", "-g", "daemon off;"]