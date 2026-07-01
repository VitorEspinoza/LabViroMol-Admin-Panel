FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx ng build --configuration production --base-href /gestao-lab-ufpr/

FROM nginx:alpine AS final
COPY --from=build /app/dist/labviromol-admin/browser /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
