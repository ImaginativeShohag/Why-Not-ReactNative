import { createSerialQueue } from "@/src/projects/podcast-player/utils/serial";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("createSerialQueue (DB write-transaction mutex)", () => {
  it("never overlaps tasks and runs them in call order", async () => {
    const q = createSerialQueue();
    const log: string[] = [];
    let running = 0;
    let maxRunning = 0;
    const task = (name: string) => async () => {
      running++;
      maxRunning = Math.max(maxRunning, running);
      log.push(`begin ${name}`);
      await tick();
      await tick();
      log.push(`commit ${name}`);
      running--;
      return name;
    };

    const results = await Promise.all([
      q.run(task("a")),
      q.run(task("b")),
      q.run(task("c")),
    ]);

    expect(results).toEqual(["a", "b", "c"]);
    expect(maxRunning).toBe(1);
    expect(log).toEqual([
      "begin a",
      "commit a",
      "begin b",
      "commit b",
      "begin c",
      "commit c",
    ]);
  });

  it("rejects only the failing caller and keeps the chain going", async () => {
    const q = createSerialQueue();
    const failing = q.run(async () => {
      await tick();
      throw new Error("BEGIN failed");
    });
    const next = q.run(async () => "ok");

    await expect(failing).rejects.toThrow("BEGIN failed");
    await expect(next).resolves.toBe("ok");
  });
});
