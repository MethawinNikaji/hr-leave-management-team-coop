import React, { useEffect, useState } from "react";
import axios from "axios";
import moment from "moment";
import { 
  FiUser, FiMail, FiCalendar, FiShield, 
  FiBriefcase, FiRefreshCw, FiEdit2, FiCheck, FiX, FiLock
} from "react-icons/fi";
import "./WorkerProfile.css";
import { alertConfirm, alertError, alertSuccess, alertInfo } from "../utils/sweetAlert";

export default function WorkerProfile() {
  const [profile, setProfile] = useState(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [loading, setLoading] = useState(!profile);
  
  // State สำหรับโหมดแก้ไข
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    currentPassword: "",
    newPassword: ""
  });

  const fetchProfile = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get("http://localhost:8000/api/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setProfile(res.data.user);
        localStorage.setItem("user", JSON.stringify(res.data.user));
        // Reset ฟอร์มข้อมูลตามฐานข้อมูลล่าสุด
        setFormData(prev => ({
          ...prev,
          firstName: res.data.user.firstName,
          lastName: res.data.user.lastName,
          currentPassword: "",
          newPassword: ""
        }));
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

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
        const token = localStorage.getItem("token");
        const res = await axios.put("http://localhost:8000/api/auth/update-profile", formData, {
        headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.data.success) {
        await alertSuccess("Success", "Profile updated successfully.");
        setIsEditing(false); // ปิดโหมดแก้ไข
        
        // --- เรียกฟังก์ชันดึงข้อมูลใหม่ เพื่ออัปเดต UI โดยไม่ต้องรีโหลดหน้า ---
        await fetchProfile(); 
        // --------------------------------------------------------
        }
    } catch (err) {
        await alertError("Error", (err.response?.data?.message || "Update failed."));
    }
  };

  if (loading) return <div className="p-loader">Loading profile...</div>;
  if (!profile) return <div className="p-error">User not found</div>;

  const initials = (profile.firstName?.charAt(0) || "U") + (profile.lastName?.charAt(0) || "");

  return (
    <div className="profile-page-container">
      <header className="profile-page-header">
        <h1 className="profile-page-title">My Profile</h1>
        
      </header>

      <div className="profile-main-content">
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

        <form className="profile-details-grid" onSubmit={handleUpdate}>
          {/* ข้อมูลส่วนตัว */}
          <section className="info-section">
            <h3 className="section-header"><FiUser /> Personal Information</h3>
            <div className="info-field-list">
              <div className="info-box">
                <label>First name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    className="edit-input"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                  />
                ) : <p>{profile.firstName}</p>}
              </div>
              <div className="info-box">
                <label>Last name</label>
                {isEditing ? (
                  <input 
                    type="text" 
                    className="edit-input"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                  />
                ) : <p>{profile.lastName}</p>}
              </div>
              <div className="info-box">
                <label><FiMail /> Contact email</label>
                <p>{profile.email}</p>
              </div>
            </div>
          </section>

          {/* ข้อมูลการทำงาน หรือ โหมดเปลี่ยนรหัสผ่าน */}
          {!isEditing ? (
            <section className="info-section">
              <h3 className="section-header"><FiBriefcase /> Employment Information</h3>
              <div className="info-field-list">
                <div className="info-box">
                  <label>Employee ID</label>
                  <p>#{profile.employeeId}</p>
                </div>
                <div className="info-box">
                  <label><FiCalendar /> Start date</label>
                  <p>{profile.joiningDate ? moment(profile.joiningDate).format("DD MMM YYYY") : "-"}</p>
                </div>
                <div className={`info-box highlight ${profile.isActive ? 'ok' : 'danger'}`}>
                  <label><FiShield /> Employment status</label>
                  <p>{profile.isActive ? "Active" : "Inactive"}</p>
                </div>
              </div>
            </section>
          ) : (
            <section className="info-section edit-password-section">
              <h3 className="section-header"><FiLock /> Change Password</h3>
              <div className="info-field-list">
                <div className="info-box">
                  <label>Current password (to confirm changes)</label>
                  <input 
                    type="password" 
                    className="edit-input"
                    placeholder="Enter current password..."
                    value={formData.currentPassword}
                    onChange={(e) => setFormData({...formData, currentPassword: e.target.value})}
                  />
                </div>
                <div className="info-box">
                  <label>New password (leave blank to keep current)</label>
                  <input 
                    type="password" 
                    className="edit-input"
                    placeholder="Enter new password..."
                    value={formData.newPassword}
                    onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                  />
                </div>
                <p className="edit-hint">* To change your password, fill in both fields.</p>
              </div>
            </section>
          )}
        </form>
      </div>
    </div>
  );
}
