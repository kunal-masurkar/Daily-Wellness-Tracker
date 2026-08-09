import React, { useState, useEffect, useMemo } from 'react';
import { Activity, Moon, Smile, Zap, LogOut, CheckCircle2, Calendar, AlertCircle } from 'lucide-react';
import { api } from '../api.js';

// Client-side pure score preview calculation
function calculateLocalScore(sleep, mood, energy) {
  let sleepScore = 0;
  if (sleep >= 7 && sleep <= 9) {
    sleepScore = 100;
  } else if (sleep < 7) {
    sleepScore = Math.max(0, (sleep / 7) * 100);
  } else {
    sleepScore = Math.max(0, 100 - (sleep - 9) * 12.5);
  }
  const moodScore = Math.min(100, Math.max(0, mood * 10));
  const energyScore = Math.min(100, Math.max(0, energy * 10));
  const score = (sleepScore * 0.40) + (moodScore * 0.30) + (energyScore * 0.30);
  return Math.round(score * 10) / 10;
}

export function Dashboard({ user, onLogout, showToast, onUnauthorized }) {
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  const [selectedDate, setSelectedDate] = useState(getTodayStr());
  const [sleepHours, setSleepHours] = useState(7.5);
  const [mood, setMood] = useState(7);
  const [energy, setEnergy] = useState(7);
  
  const [todayCheckin, setTodayCheckin] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [serverError, setServerError] = useState('');

  // Live preview calculation based on active form controls
  const liveScore = useMemo(() => {
    return calculateLocalScore(Number(sleepHours), Number(mood), Number(energy));
  }, [sleepHours, mood, energy]);

  // Load today's checkin & 7-day trend
  const fetchData = async (dateStr) => {
    setIsLoading(true);
    setServerError('');

    const [todayRes, trendRes] = await Promise.all([
      api.getTodayCheckin(dateStr),
      api.getLast7DaysTrend(dateStr)
    ]);

    if (todayRes.status === 401 || trendRes.status === 401) {
      onUnauthorized();
      return;
    }

    if (!todayRes.success || !trendRes.success) {
      setServerError('Unable to reach server. Please check your connection.');
      setIsLoading(false);
      return;
    }

    if (todayRes.data.checkin) {
      const c = todayRes.data.checkin;
      setTodayCheckin(c);
      setSleepHours(c.sleep_hours);
      setMood(c.mood);
      setEnergy(c.energy);
    } else {
      setTodayCheckin(null);
    }

    setTrendData(trendRes.data.trend || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchData(selectedDate);
  }, [selectedDate]);

  const handleSaveCheckin = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setServerError('');

    const payload = {
      date: selectedDate,
      sleep_hours: Number(sleepHours),
      mood: Number(mood),
      energy: Number(energy)
    };

    const res = await api.saveCheckin(payload);
    setIsSaving(false);

    if (res.status === 401) {
      onUnauthorized();
      return;
    }

    if (res.success) {
      showToast('Wellness check-in saved successfully!', 'success');
      fetchData(selectedDate);
    } else {
      showToast(res.error || 'Failed to save check-in', 'error');
    }
  };

  // Helper score status styling
  const getScoreStatus = (score) => {
    if (score === null || score === undefined) return { label: 'No Data', color: 'var(--text-muted)' };
    if (score < 40) return { label: 'Needs Attention', color: 'var(--accent-rose)' };
    if (score <= 70) return { label: 'Fair', color: 'var(--accent-amber)' };
    return { label: 'Optimal', color: '#16a34a' };
  };

  const todayScoreStatus = getScoreStatus(todayCheckin ? todayCheckin.wellness_score : null);

  return (
    <div className="app-container">
      {/* Header Bar */}
      <header className="app-header">
        <div className="brand">
          <div className="brand-icon">
            <Activity size={24} />
          </div>
          <span className="brand-title">Daily Wellness</span>
        </div>

        <div className="user-controls">
          <span className="user-email-badge" id="user-email-display">{user?.email}</span>
          <button className="btn-logout" onClick={onLogout} id="logout-btn">
            <LogOut size={16} />
            Logout
          </button>
        </div>
      </header>

      {serverError && (
        <div className="server-down-banner">
          <AlertCircle size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
          {serverError}
        </div>
      )}

      {/* Main Grid */}
      <div className="dashboard-grid">
        {/* Score Hero Card */}
        <div className="card score-hero-card">
          <h3 style={{ color: 'var(--dark-gray)', fontSize: '1rem', fontWeight: 700 }}>
            Today's Wellness Score
          </h3>

          <div className="score-circle-outer" style={{
            '--score-val': todayCheckin ? todayCheckin.wellness_score : 0,
            '--score-color': todayScoreStatus.color
          }}>
            <div className="score-circle-bg"></div>
            <div className="score-circle-inner">
              <span className="score-value" id="today-score-display">
                {todayCheckin ? todayCheckin.wellness_score : '--'}
              </span>
              <span className="score-max">/ 100</span>
            </div>
          </div>

          <div 
            className="score-badge" 
            style={{ 
              backgroundColor: `${todayScoreStatus.color}15`,
              color: todayScoreStatus.color,
              border: `1px solid ${todayScoreStatus.color}40`
            }}
          >
            {todayScoreStatus.label}
          </div>

          {todayCheckin ? (
            <div style={{ marginTop: '1.2rem', display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--dark-gray)', fontWeight: 600 }}>
              <span><Moon size={14} style={{ color: 'var(--primary-green)' }} /> {todayCheckin.sleep_hours}h</span>
              <span><Smile size={14} style={{ color: 'var(--primary-green)' }} /> Mood {todayCheckin.mood}/10</span>
              <span><Zap size={14} style={{ color: 'var(--accent-amber)' }} /> Energy {todayCheckin.energy}/10</span>
            </div>
          ) : (
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Log your metrics below to record today's score
            </p>
          )}
        </div>

        {/* Check-In Form */}
        <div className="card">
          <h3 style={{ marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Calendar size={20} style={{ color: 'var(--primary-green)' }} />
            Record Check-In
          </h3>

          <form onSubmit={handleSaveCheckin}>
            <div className="form-group">
              <label htmlFor="checkin-date">Target Date</label>
              <input
                id="checkin-date"
                type="date"
                className="form-control"
                style={{ paddingLeft: '1rem' }}
                value={selectedDate}
                max={getTodayStr()}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            </div>

            {/* Sleep Slider */}
            <div className="slider-group">
              <div className="slider-label-header">
                <span className="slider-label">
                  <Moon size={18} style={{ color: 'var(--primary-green)' }} />
                  Sleep Hours
                </span>
                <span className="slider-value-display">{sleepHours} hrs</span>
              </div>
              <input
                type="range"
                className="range-input"
                min="0"
                max="14"
                step="0.5"
                value={sleepHours}
                onChange={(e) => setSleepHours(parseFloat(e.target.value))}
                id="sleep-slider"
              />
            </div>

            {/* Mood Slider */}
            <div className="slider-group">
              <div className="slider-label-header">
                <span className="slider-label">
                  <Smile size={18} style={{ color: 'var(--primary-green)' }} />
                  Mood Rating
                </span>
                <span className="slider-value-display">{mood} / 10</span>
              </div>
              <input
                type="range"
                className="range-input"
                min="1"
                max="10"
                step="1"
                value={mood}
                onChange={(e) => setMood(parseInt(e.target.value))}
                id="mood-slider"
              />
            </div>

            {/* Energy Slider */}
            <div className="slider-group">
              <div className="slider-label-header">
                <span className="slider-label">
                  <Zap size={18} style={{ color: 'var(--accent-amber)' }} />
                  Energy Level
                </span>
                <span className="slider-value-display">{energy} / 10</span>
              </div>
              <input
                type="range"
                className="range-input"
                min="1"
                max="10"
                step="1"
                value={energy}
                onChange={(e) => setEnergy(parseInt(e.target.value))}
                id="energy-slider"
              />
            </div>

            {/* Live Score Preview Box */}
            <div className="live-preview-box">
              <span style={{ fontSize: '0.9rem', color: 'var(--dark-gray)', fontWeight: 600 }}>Calculated Score Preview:</span>
              <span style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--charcoal-black)' }}>{liveScore} / 100</span>
            </div>

            <button type="submit" className="btn-primary" disabled={isSaving} id="save-checkin-btn">
              {isSaving ? (
                <div className="spinner"></div>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  {todayCheckin ? 'Update Check-In' : 'Submit Check-In'}
                </>
              )}
            </button>
          </form>
        </div>

        {/* 7-Day Trend Section */}
        <div className="card trend-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Activity size={20} style={{ color: 'var(--primary-green)' }} />
            7-Day Wellness Trend
          </h3>

          <div className="trend-grid">
            {trendData.map((item) => {
              const status = getScoreStatus(item.wellness_score);
              const isSelected = item.date === selectedDate;
              const formattedDate = new Date(`${item.date}T00:00:00Z`).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'numeric',
                day: 'numeric'
              });

              return (
                <div
                  key={item.date}
                  className={`trend-card ${isSelected ? 'active' : ''}`}
                  onClick={() => setSelectedDate(item.date)}
                  style={{ cursor: 'pointer' }}
                >
                  <span className="trend-date">{formattedDate}</span>

                  {item.has_data ? (
                    <>
                      <div
                        className="trend-score-badge"
                        style={{
                          backgroundColor: `${status.color}15`,
                          color: status.color,
                          border: `1px solid ${status.color}40`
                        }}
                      >
                        {item.wellness_score}
                      </div>
                      <div className="trend-details">
                        <div>{item.sleep_hours}h sleep</div>
                        <div>M:{item.mood} E:{item.energy}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="trend-empty-dash">-</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No record</span>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
