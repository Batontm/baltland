import { hash } from "bcryptjs"
import { createAdminClient } from "@/lib/supabase/admin"

async function resetAdminPassword() {
  console.log("[v0] ========== RESETTING ADMIN PASSWORD ==========")

  // Generate a fresh bcrypt hash for password "123"
  const password = "123"
  const saltRounds = 10
  const newHash = await hash(password, saltRounds)

  console.log('[v0] Generated new bcrypt hash for password "123"')
  console.log("[v0] Hash:", newHash)

  // Update the database
  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from("admin_users")
    .update({
      password_hash: newHash,
      updated_at: new Date().toISOString(),
    })
    .eq("username", "admin")
    .select()

  if (error) {
    console.error("[v0] ❌ Error updating password:", error)
    return
  }

  console.log("[v0] ✅ Password updated successfully")
  console.log("[v0] Updated user:", data)

  // Verify the hash works
  const bcrypt = require("bcryptjs")
  const isValid = await bcrypt.compare(password, newHash)
  console.log('[v0] Verification - Hash matches password "123":', isValid)

  console.log("[v0] ==========================================")
  console.log("[v0] Login credentials:")
  console.log("[v0]   Username: admin")
  console.log("[v0]   Password: 123")
  console.log("[v0] ==========================================")
}

resetAdminPassword()
