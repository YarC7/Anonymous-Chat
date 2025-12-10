@echo off
echo Starting Redis in Docker...
docker run -d --name anonymous-chat-redis -p 6379:6379 redis:alpine
echo.
echo Redis started! Container name: anonymous-chat-redis
echo Port: 6379
echo.
echo To verify it's running:
echo   redis-cli ping
echo.
echo To stop:
echo   docker stop anonymous-chat-redis
echo.
echo To remove:
echo   docker rm anonymous-chat-redis
