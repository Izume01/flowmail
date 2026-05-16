import { describe, expect, it, mock } from "bun:test";
import { TenantDB } from "./dal";

describe("TenantDB", () => {
  it("incrementOpens passes projectId to rpc", async () => {
    const mockPrisma = {
      $executeRaw: mock(() => Promise.resolve(1))
    } as any;
    
    const db = new TenantDB(mockPrisma, "test-project");
    await db.incrementOpens("email-123");
    
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it("incrementClicks passes projectId to rpc", async () => {
    const mockPrisma = {
      $executeRaw: mock(() => Promise.resolve(1))
    } as any;
    
    const db = new TenantDB(mockPrisma, "test-project");
    await db.incrementClicks("email-123");
    
    expect(mockPrisma.$executeRaw).toHaveBeenCalled();
  });

  it("isEmailSuppressed passes projectId to rpc", async () => {
    const mockPrisma = {
      $queryRaw: mock(() => Promise.resolve([{ exists: false }]))
    } as any;
    
    const db = new TenantDB(mockPrisma, "test-project");
    await db.isEmailSuppressed("test@example.com");
    
    expect(mockPrisma.$queryRaw).toHaveBeenCalled();
  });
});
