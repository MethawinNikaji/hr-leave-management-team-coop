import React, { createContext, useContext, useMemo, useState, useEffect } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // 1. 🔥 จุดที่แก้: เริ่มต้น State ด้วยการอ่านจาก LocalStorage
  const [user, setUser] = useState(() => {
    try {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser);
        // แปลงข้อมูลให้ตรงกับที่ Sidebar เรียกใช้
        // Backend ส่งมาเป็น firstName แต่ Sidebar อยากได้ name
        return {
          ...parsedUser,
          name: parsedUser.firstName + " " + (parsedUser.lastName || ""), // รวมชื่อ-นามสกุล
          role: parsedUser.role
        };
      }
    } catch (error) {
      console.error("Failed to parse user from local storage:", error);
    }
    
    // ถ้าไม่มีข้อมูล ให้เป็น Guest
    return { name: "Guest", role: "Guest" };
  });

  // ฟังก์ชัน Login (เผื่อไว้ใช้ในอนาคตแทน window.location)
  const login = (userData, token) => {
    // Save ลง Storage
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(userData));
    
    // Update State ทันที
    setUser({
      ...userData,
      name: userData.firstName + " " + (userData.lastName || ""),
      role: userData.role
    });
  };

  // ฟังก์ชัน Logout
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser({ name: "Guest", role: "Guest" });
    // ย้ายไปหน้า Login
    window.location.href = "/login";
  };

  const value = useMemo(
    () => ({
      user,
      login,  // ส่งฟังก์ชัน login ตัวจริงออกไป
      logout, // ส่งฟังก์ชัน logout ตัวจริงออกไป
      // Mock เดิมเอาออกได้เลย หรือจะเก็บไว้เทสก็ได้ แต่น่าจะไม่ได้ใช้แล้ว
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}