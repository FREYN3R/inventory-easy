cat > start.sh << 'EOF'
#!/bin/bash
echo "🚀 Iniciando InventoryEasy..."
docker-compose up -d
sleep 30
echo "✅ Proyecto iniciado"
echo "Frontend: http://localhost:5173"
EOF

chmod +x start.sh

cat > stop.sh << 'EOF'
#!/bin/bash
docker-compose down
EOF

chmod +x stop.sh