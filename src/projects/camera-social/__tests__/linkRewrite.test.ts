import {
  rewriteCameraSocialPath,
  SHARE_INBOUND_ROUTE,
} from "@/src/projects/camera-social/utils/linkRewrite";

const DOMAIN = "whynotreactnative.example.com";

describe("rewriteCameraSocialPath", () => {
  it("routes the share-extension URL to the inbound screen", () => {
    expect(
      rewriteCameraSocialPath(
        "whynotreactnative://dataUrl=whynotreactnativeShareKey#media",
        DOMAIN,
      ),
    ).toBe(SHARE_INBOUND_ROUTE);
  });

  it("maps the universal link onto the namespaced post route", () => {
    expect(
      rewriteCameraSocialPath(`https://${DOMAIN}/post/lx2abc9`, DOMAIN),
    ).toBe("/projects/camera-social/post/lx2abc9");
    expect(
      rewriteCameraSocialPath(
        `https://${DOMAIN.toUpperCase()}/post/a1/?ref=x`,
        DOMAIN,
      ),
    ).toBe("/projects/camera-social/post/a1");
  });

  it("maps a bare /post/<id> path", () => {
    expect(rewriteCameraSocialPath("/post/abc", DOMAIN)).toBe(
      "/projects/camera-social/post/abc",
    );
  });

  it("leaves other hosts, projects and malformed ids alone", () => {
    expect(
      rewriteCameraSocialPath("https://evil.example/post/abc", DOMAIN),
    ).toBeNull();
    expect(
      rewriteCameraSocialPath(`https://${DOMAIN}/p/42`, DOMAIN),
    ).toBeNull();
    expect(
      rewriteCameraSocialPath("/projects/camera-social/post/abc", DOMAIN),
    ).toBeNull();
    expect(rewriteCameraSocialPath("/post/a%20b", DOMAIN)).toBeNull();
  });
});
