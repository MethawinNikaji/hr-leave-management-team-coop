import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";
import { 
  FiUser, FiMail, FiCalendar, FiShield, 
  FiBriefcase, FiRefreshCw, FiInfo 
} from "react-icons/fi";
import "./WorkerProfile.css";

export default function WorkerProfile() {
  const [profile, setProfile] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(!profile);

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setProfile(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
      }
    } catch (err) {
      console.error("Error fetching profile:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  if (loading) return <div className="p-loader">กำลังโหลดข้อมูลโปรไฟล์...</div>;
  if (!profile) return <div className="p-error">ไม่พบข้อมูลผู้ใช้งาน</div>;

  const initials = (profile.firstName?.charAt(0) || "U") + (profile.lastName?.charAt(0) || "");

  return (
    <div className="profile-page-container">
      <header className="profile-page-header">
        <h1 className="profile-page-title">My Profile</h1>
      </header>

      <div className="profile-main-content">
        {/* Left Column: Identity Card */}
        <aside className="profile-identity-card">
          <div className="avatar-section">
            <div className="avatar-circle">
              {profile.profileImageUrl ? (
                <img src={profile.profileImageUrl} alt="Profile" />
              ) : (
                initials.toUpperCase()
              )}
            </div>
            <h2 className="display-name">{profile.firstName} {profile.lastName}</h2>
            <span className="badge-role">{profile.role || "Worker"}</span>
            <div className={`status-pill ${profile.isActive ? 'active' : 'inactive'}`}>
              <span className="dot"></span>
              {profile.isActive ? "Active Employee" : "Inactive"}
            </div>
          </div>
        </aside>

        {/* Right Column: Information Sections */}
        <div className="profile-details-grid">
          {/* Personal Info Card */}
          <section className="info-section">
            <h3 className="section-header"><FiUser /> ข้อมูลส่วนตัว</h3>
            <div className="info-field-list">
              <div className="info-box">
                <label>ชื่อ-นามสกุล</label>
                <p>{profile.firstName} {profile.lastName}</p>
              </div>
              <div className="info-box">
                <label><FiMail /> อีเมลติดต่อ</label>
                <p>{profile.email}</p>
              </div>
            </div>
          </section>

          {/* Work Info Card */}
          <section className="info-section">
            <h3 className="section-header"><FiBriefcase /> ข้อมูลการทำงาน</h3>
            <div className="info-field-list">
              <div className="info-box">
                <label>รหัสพนักงาน</label>
                <p>#{profile.employeeId}</p>
              </div>
              <div className="info-box">
                <label><FiCalendar /> วันที่เริ่มงาน</label>
                <p>{profile.joiningDate ? moment(profile.joiningDate).format("DD MMM YYYY") : "-"}</p>
              </div>
              <div className={`info-box highlight ${profile.isActive ? 'ok' : 'danger'}`}>
                <label><FiShield /> สถานะพนักงาน</label>
                <p>{profile.isActive ? "กำลังทำงาน (Active)" : "พ้นสภาพพนักงาน"}</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}