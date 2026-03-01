import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppProject } from '@/contexts/AppProjectContext'
import { useWeather } from '@/hooks/useWeather'
import { MobileAppLayout } from '@/components/app/MobileAppLayout'
import { cn } from '@/lib/utils'

export default function AppWeather() {
  const { t } = useTranslation('app')
  const navigate = useNavigate()
  const { selectedProject } = useAppProject()
  
  // Get project location for weather data (fallback to default)
  const projectLocation = (selectedProject as any)?.location || 'Sao Paulo, Brazil'
  const { weatherData, loading, retry } = useWeather(projectLocation)

  const getWeatherIcon = (condition?: string) => {
    if (!condition) return 'wb_sunny'
    const c = condition.toLowerCase()
    if (c.includes('rain') || c.includes('chuva')) return 'rainy'
    if (c.includes('cloud') || c.includes('nublado')) return 'cloud'
    if (c.includes('storm') || c.includes('tempest')) return 'thunderstorm'
    if (c.includes('snow')) return 'weather_snowy'
    return 'wb_sunny'
  }

  const getRiskColor = (risk?: string) => {
    switch (risk) {
      case 'low': return 'text-green-400 bg-green-400/20'
      case 'medium': return 'text-amber-400 bg-amber-400/20'
      case 'high': return 'text-orange-400 bg-orange-400/20'
      case 'critical': return 'text-red-400 bg-red-400/20'
      default: return 'text-green-400 bg-green-400/20'
    }
  }

  return (
    <MobileAppLayout>
      <div className="min-h-screen bg-[#0A0D0F] text-white pb-20">
        {/* Header with Back Button */}
        <header className="sticky top-0 z-50 bg-black/95 backdrop-blur-xl border-b border-white/5">
          <div className="flex items-center gap-3 px-4 py-3">
            <button 
              onClick={() => navigate(-1)}
              className="size-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400 hover:bg-white/10 transition-colors"
            >
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{t('weather.title', 'Weather Forecast')}</h1>
              <p className="text-xs text-slate-500">{weatherData?.location || projectLocation}</p>
            </div>
            <button 
              onClick={() => retry()}
              disabled={loading}
              className="size-10 rounded-xl bg-amber-400/20 flex items-center justify-center text-amber-400"
            >
              <span className={cn("material-symbols-outlined", loading && "animate-spin")}>refresh</span>
            </button>
          </div>
        </header>

        {/* Current Weather Card */}
        <div className="p-4">
          <div className="bg-gradient-to-br from-blue-600/30 to-purple-600/30 rounded-3xl p-6 border border-white/10">
            <div className="flex items-center gap-4">
              <div className="size-20 rounded-2xl bg-white/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-5xl text-amber-400">
                  {getWeatherIcon(weatherData?.current?.condition)}
                </span>
              </div>
              <div className="flex-1">
                <p className="text-5xl font-bold">
                  {weatherData?.current?.temp !== undefined ? `${weatherData.current.temp}°C` : '—'}
                </p>
                <p className="text-slate-300">{weatherData?.current?.condition || t('weather.loading', 'Loading...')}</p>
                <p className="text-sm text-slate-500">
                  {t('weather.feelsLike', 'Feels like')} {weatherData?.current?.feelsLike !== undefined ? `${weatherData.current.feelsLike}°C` : '—'}
                </p>
              </div>
            </div>
            <div className="flex gap-4 mt-6">
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-400">{t('weather.high', 'High')}</p>
                <p className="text-xl font-bold">{weatherData?.current?.high !== undefined ? `${weatherData.current.high}°` : '—'}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-xs text-slate-400">{t('weather.low', 'Low')}</p>
                <p className="text-xl font-bold">{weatherData?.current?.low !== undefined ? `${weatherData.current.low}°` : '—'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 7-Day Forecast */}
        <div className="px-4 mb-4">
          <div className="bg-[#121619] border border-white/5 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-slate-300 mb-4">{t('weather.sevenDayForecast', '7-Day Forecast')}</h3>
            <div className="space-y-3">
              {weatherData?.daily?.slice(0, 7).map((day, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 w-24">
                    <span className="text-sm font-medium">{day.day}</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-400">
                    <span className="material-symbols-outlined text-sm">water_drop</span>
                    <span className="text-xs">{day.precipitation}%</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-white font-medium">{day.high}°</span>
                    <span className="text-slate-500">{day.low}°</span>
                  </div>
                </div>
              )) || (
                <div className="text-center text-slate-500 py-4">{t('weather.loading', 'Loading forecast...')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Work Safety Analysis */}
        {weatherData?.operationalImpact && (
          <div className="px-4 mb-4">
            <div className="bg-[#121619] border border-white/5 rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-4">
                <span className="material-symbols-outlined text-amber-400">construction</span>
                <h3 className="text-sm font-bold text-slate-300">{t('weather.workSafetyAnalysis', 'Work Safety Analysis')}</h3>
              </div>
              <p className="text-xs text-slate-500 mb-4">
                {t('weather.aiAssessment', 'AI-powered assessment of weather conditions for construction activities')}
              </p>
              
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs text-slate-500 mb-1">{t('weather.suitabilityScore', 'Work Suitability Score')}</p>
                  <p className="text-4xl font-bold text-amber-400">
                    {weatherData.operationalImpact.workSuitabilityScore}/100
                  </p>
                </div>
                <div className={cn(
                  "px-4 py-2 rounded-xl text-sm font-bold uppercase",
                  getRiskColor(weatherData.operationalImpact.overallRisk)
                )}>
                  {weatherData.operationalImpact.overallRisk} {t('weather.risk', 'Risk')}
                </div>
              </div>

              {weatherData.operationalImpact.recommendations?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-slate-400 font-bold mb-2">{t('weather.recommendations', 'Recommendations')}</p>
                  {weatherData.operationalImpact.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 mb-2">
                      <span className="material-symbols-outlined text-amber-400 text-sm mt-0.5">warning</span>
                      <span className="text-sm text-slate-300">{rec}</span>
                    </div>
                  ))}
                </div>
              )}

              {weatherData.activityRecommendations && (
                <div>
                  <p className="text-xs text-slate-400 font-bold mb-2">{t('weather.activitySafety', 'Activity Safety Status')}</p>
                  <div className="space-y-2">
                    {Object.entries(weatherData.activityRecommendations).map(([activity, status]) => (
                      <div key={activity} className="flex items-center justify-between">
                        <span className="text-sm text-slate-300 capitalize">{activity.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span className={cn(
                          "px-2 py-0.5 rounded text-xs font-bold",
                          status.safe ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400"
                        )}>
                          {status.safe ? t('weather.safe', 'Safe') : t('weather.delay', 'Delay')}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Hourly Forecast */}
        <div className="px-4 mb-4">
          <div className="bg-[#121619] border border-white/5 rounded-2xl p-4">
            <h3 className="text-sm font-bold text-slate-300 mb-4">{t('weather.hourlyForecast', 'Hourly Forecast')}</h3>
            <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
              {weatherData?.hourly?.slice(0, 12).map((hour, i) => (
                <div key={i} className="flex flex-col items-center gap-2 min-w-[60px]">
                  <span className="text-xs text-slate-400">{hour.time}</span>
                  <span className="material-symbols-outlined text-2xl text-amber-400">
                    {getWeatherIcon(hour.icon)}
                  </span>
                  <span className="text-sm font-bold">{hour.temp}°</span>
                </div>
              )) || (
                <div className="text-center text-slate-500 py-4 w-full">{t('weather.loading', 'Loading...')}</div>
              )}
            </div>
          </div>
        </div>

        {/* Weather Details */}
        <div className="px-4 mb-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: 'air', label: t('weather.wind', 'Wind'), value: weatherData?.current?.wind ? `${weatherData.current.wind.speed} mph ${weatherData.current.wind.direction}` : '—' },
              { icon: 'humidity_percentage', label: t('dailyLog.humidity', 'Humidity'), value: weatherData?.current?.humidity ? `${weatherData.current.humidity}%` : '—' },
              { icon: 'visibility', label: t('weather.visibility', 'Visibility'), value: weatherData?.current?.visibility ? `${weatherData.current.visibility} mi` : '—' },
              { icon: 'wb_sunny', label: t('weather.uvIndex', 'UV Index'), value: weatherData?.current?.uvIndex !== undefined ? weatherData.current.uvIndex.toString() : '—' },
              { icon: 'speed', label: t('weather.pressure', 'Pressure'), value: weatherData?.current?.pressure ? `${weatherData.current.pressure} in` : '—' },
              { icon: 'thermostat', label: t('weather.dewPoint', 'Dew Point'), value: weatherData?.current?.dewPoint !== undefined ? `${weatherData.current.dewPoint}°C` : '—' },
            ].map(item => (
              <div key={item.label} className="bg-[#121619] border border-white/5 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <span className="material-symbols-outlined text-sm">{item.icon}</span>
                  <span className="text-xs">{item.label}</span>
                </div>
                <p className="text-xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </MobileAppLayout>
  )
}
