import { logger } from '../utils/logger.js'
import { ensureRedisConnection } from '../utils/redis.js'
import { db } from '../database/init.js'

interface HealthCheck {
  service: string
  status: 'healthy' | 'unhealthy' | 'degraded'
  responseTime?: number
  error?: string
  timestamp: string
}

interface SystemMetrics {
  memory: {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  }
  cpu: {
    user: number
    system: number
  }
  uptime: number
  timestamp: string
}

class MonitoringService {
  private healthChecks: Map<string, HealthCheck> = new Map()
  private metrics: SystemMetrics[] = []
  private maxMetricsHistory = 100

  async checkDatabaseHealth(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      await db.raw('SELECT 1')
      const responseTime = Date.now() - start
      
      const healthCheck: HealthCheck = {
        service: 'database',
        status: responseTime < 1000 ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date().toISOString()
      }
      
      this.healthChecks.set('database', healthCheck)
      return healthCheck
    } catch (error) {
      const healthCheck: HealthCheck = {
        service: 'database',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
      
      this.healthChecks.set('database', healthCheck)
      logger.error('Database health check failed:', error)
      return healthCheck
    }
  }

  async checkRedisHealth(): Promise<HealthCheck> {
    const start = Date.now()
    try {
      await ensureRedisConnection()
      const responseTime = Date.now() - start
      
      const healthCheck: HealthCheck = {
        service: 'redis',
        status: responseTime < 500 ? 'healthy' : 'degraded',
        responseTime,
        timestamp: new Date().toISOString()
      }
      
      this.healthChecks.set('redis', healthCheck)
      return healthCheck
    } catch (error) {
      const healthCheck: HealthCheck = {
        service: 'redis',
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
      
      this.healthChecks.set('redis', healthCheck)
      logger.warn('Redis health check failed:', error)
      return healthCheck
    }
  }

  collectSystemMetrics(): SystemMetrics {
    const memUsage = process.memoryUsage()
    const cpuUsage = process.cpuUsage()
    
    const metrics: SystemMetrics = {
      memory: {
        rss: memUsage.rss,
        heapTotal: memUsage.heapTotal,
        heapUsed: memUsage.heapUsed,
        external: memUsage.external
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system
      },
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    }

    // Store metrics with limited history
    this.metrics.push(metrics)
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics.shift()
    }

    return metrics
  }

  async performHealthChecks(): Promise<{ overall: string; services: HealthCheck[] }> {
    const services = await Promise.all([
      this.checkDatabaseHealth(),
      this.checkRedisHealth()
    ])

    const unhealthyServices = services.filter(s => s.status === 'unhealthy')
    const degradedServices = services.filter(s => s.status === 'degraded')

    let overall = 'healthy'
    if (unhealthyServices.length > 0) {
      overall = 'unhealthy'
    } else if (degradedServices.length > 0) {
      overall = 'degraded'
    }

    return { overall, services }
  }

  getSystemStatus() {
    const currentMetrics = this.collectSystemMetrics()
    const healthChecks = Array.from(this.healthChecks.values())
    
    return {
      status: healthChecks.every(h => h.status === 'healthy') ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.version,
      environment: process.env.NODE_ENV || 'development',
      metrics: currentMetrics,
      services: healthChecks
    }
  }

  getMetricsHistory() {
    return this.metrics
  }

  // Alert system for critical issues
  async checkForAlerts() {
    const currentMetrics = this.collectSystemMetrics()
    const memoryUsagePercent = (currentMetrics.memory.heapUsed / currentMetrics.memory.heapTotal) * 100

    // Memory usage alert
    if (memoryUsagePercent > 90) {
      logger.error('Critical memory usage alert', {
        memoryUsagePercent,
        heapUsed: currentMetrics.memory.heapUsed,
        heapTotal: currentMetrics.memory.heapTotal,
        timestamp: currentMetrics.timestamp
      })
    } else if (memoryUsagePercent > 80) {
      logger.warn('High memory usage warning', {
        memoryUsagePercent,
        heapUsed: currentMetrics.memory.heapUsed,
        heapTotal: currentMetrics.memory.heapTotal,
        timestamp: currentMetrics.timestamp
      })
    }

    // Check service health
    const healthStatus = await this.performHealthChecks()
    if (healthStatus.overall === 'unhealthy') {
      logger.error('Service health alert - unhealthy services detected', {
        services: healthStatus.services.filter(s => s.status === 'unhealthy'),
        timestamp: new Date().toISOString()
      })
    }
  }

  startMonitoring() {
    // Collect metrics every minute
    setInterval(() => {
      this.collectSystemMetrics()
    }, 60 * 1000)

    // Check for alerts every 5 minutes
    setInterval(() => {
      this.checkForAlerts()
    }, 5 * 60 * 1000)

    // Perform health checks every 2 minutes
    setInterval(() => {
      this.performHealthChecks()
    }, 2 * 60 * 1000)

    logger.info('Monitoring service started')
  }
}

export const monitoringService = new MonitoringService()