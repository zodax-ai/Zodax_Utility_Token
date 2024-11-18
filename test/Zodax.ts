import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { anyValue } from "@nomicfoundation/hardhat-chai-matchers/withArgs";
import { expect } from "chai";
import hre, { ethers, upgrades } from "hardhat";

describe("Zodax", function () {
  async function deployZodaxFixture() {
    const [owner, buyer, defaultAdmin, pauser, anotherAccount] =
      await hre.ethers.getSigners();

    const Token = await hre.ethers.getContractFactory("Zodax");
    const token = await Token.deploy(
      defaultAdmin.address,
      owner.address,
      pauser.address,
      ethers.parseEther("3000000")
    );

    return {
      owner,
      buyer,
      pauser,
      defaultAdmin,
      anotherAccount,
      token,
    };
  }

  describe("Deployment", function () {
    it("Should deploy the Zodax Token contract", async function () {
      const { token, pauser, owner, defaultAdmin } = await loadFixture(
        deployZodaxFixture
      );

      expect(await token.name()).to.equal("Zodax");
      expect(await token.symbol()).to.equal("ZDX");
      expect(await token.decimals()).to.equal(18);
      expect(await token.totalSupply()).to.equal(ethers.parseEther("3000000"));
      expect(await token.maxTotalSupply()).to.equal(
        ethers.parseEther("3000000")
      );
      expect(await token.balanceOf(owner.address)).to.equal(
        ethers.parseEther("3000000")
      );
      expect(
        await token.hasRole(
          await token.DEFAULT_ADMIN_ROLE(),
          defaultAdmin.address
        )
      ).to.be.true;
      expect(await token.hasRole(await token.PAUSER_ROLE(), pauser.address)).to
        .be.true;
    });
  });

  describe("Pausing", function () {
    it("Should pause and unpause the token", async function () {
      const { token, pauser, owner, defaultAdmin } = await loadFixture(
        deployZodaxFixture
      );

      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      await token.connect(pauser).unpause();
      expect(await token.paused()).to.be.false;
    });

    it("Should not allow transfers when paused", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      await expect(
        token.connect(owner).transfer(buyer.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });
  });

  describe("Unpausing", function () {
    it("Should not allow unpausing by non-pauser", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      await expect(
        token.connect(buyer).unpause()
      ).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should allow unpausing by pauser", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      await token.connect(pauser).unpause();
      expect(
        await token
          .connect(owner)
          .transfer(buyer.address, ethers.parseEther("1000"))
      ).to.emit(token, "Transfer");

      expect(await token.balanceOf(buyer.address)).to.equal(
        ethers.parseEther("1000")
      );
    });
  });

  describe("Approve", function () {
    it("Should approve spender to spend tokens", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token
        .connect(owner)
        .approve(buyer.address, ethers.parseEther("1000"));
      expect(await token.allowance(owner.address, buyer.address)).to.equal(
        ethers.parseEther("1000")
      );
    });

    it("Should allow approval when paused", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      expect(
        await token
          .connect(owner)
          .approve(buyer.address, ethers.parseEther("1000"))
      ).to.be.ok;

      expect(await token.allowance(owner.address, buyer.address)).to.equal(
        ethers.parseEther("1000")
      );
    });

    it("Should not allow approval to the zero address", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await expect(
        token.connect(owner).approve(ethers.ZeroAddress, 1000)
      ).to.be.revertedWithCustomError(token, "ERC20InvalidSpender");
    });
  });

  describe("Transfer", function () {
    it("Should transfer tokens", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token
        .connect(owner)
        .transfer(buyer.address, ethers.parseEther("1000"));
      expect(await token.balanceOf(buyer.address)).to.equal(
        ethers.parseEther("1000")
      );
    });

    it("Should not allow transfers when paused", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      await expect(
        token.connect(owner).transfer(buyer.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should not allow transfers to the zero address", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await expect(
        token.connect(owner).transfer(ethers.ZeroAddress, 1000)
      ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
    });

    it("Should not allow transfers from the zero address", async function () {
      it("Should not allow transfers from the zero address", async function () {
        const { token, owner, buyer } = await loadFixture(deployZodaxFixture);

        await expect(
          token.transferFrom(ethers.ZeroAddress, buyer.address, 1000)
        ).to.be.revertedWithCustomError(token, "ERC20InvalidSender");
      });
    });

    it("Should not allow transfers when sender has insufficient balance", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await expect(
        token.connect(buyer).transfer(owner.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("TransferFrom", function () {
    it("Should transfer tokens from approved spender", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token
        .connect(owner)
        .approve(buyer.address, ethers.parseEther("1000"));
      await token
        .connect(buyer)
        .transferFrom(owner.address, buyer.address, ethers.parseEther("1000"));
      expect(await token.balanceOf(buyer.address)).to.equal(
        ethers.parseEther("1000")
      );
    });

    it("Should not allow transfers when paused", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token.connect(pauser).pause();
      expect(await token.paused()).to.be.true;

      await token
        .connect(owner)
        .approve(buyer.address, ethers.parseEther("1000"));
      await expect(
        token
          .connect(buyer)
          .transferFrom(owner.address, buyer.address, ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");
    });

    it("Should not allow transfers to the zero address", async function () {
      const { token, pauser, owner, buyer } = await loadFixture(
        deployZodaxFixture
      );

      await token
        .connect(owner)
        .approve(buyer.address, ethers.parseEther("1000"));
      await expect(
        token
          .connect(buyer)
          .transferFrom(
            owner.address,
            ethers.ZeroAddress,
            ethers.parseEther("1000")
          )
      ).to.be.revertedWithCustomError(token, "ERC20InvalidReceiver");
    });
  });

  describe("Burning", function () {
    it("Should allow token holders to burn their tokens", async function () {
      const { token, owner } = await loadFixture(deployZodaxFixture);

      await token.connect(owner).burn(ethers.parseEther("100"));
      expect(await token.balanceOf(owner.address)).to.equal(
        ethers.parseEther("2999900")
      );
    });

    it("Should prevent burning more tokens than balance", async function () {
      const { token, buyer } = await loadFixture(deployZodaxFixture);

      await expect(
        token.connect(buyer).burn(ethers.parseEther("1000"))
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });
  });

  describe("Emergency Withdraw", function () {
    it("Should allow admin to withdraw tokens sent to the contract", async function () {
      const { token, defaultAdmin, anotherAccount } = await loadFixture(
        deployZodaxFixture
      );

      const TestToken = await ethers.getContractFactory("TestToken");
      const testToken = await TestToken.deploy();

      await testToken.mint(token.target, ethers.parseEther("500"));
      expect(await testToken.balanceOf(token.target)).to.equal(
        ethers.parseEther("500")
      );

      await token
        .connect(defaultAdmin)
        .emergencyWithdraw(
          testToken.target,
          anotherAccount.address,
          ethers.parseEther("500")
        );

      expect(await testToken.balanceOf(anotherAccount.address)).to.equal(
        ethers.parseEther("500")
      );
    });

    it("Should prevent non-admin from calling emergencyWithdraw", async function () {
      const { token, buyer } = await loadFixture(deployZodaxFixture);

      const TestToken = await ethers.getContractFactory("TestToken");
      const testToken = await TestToken.deploy();

      await testToken.mint(token.target, ethers.parseEther("500"));

      await expect(
        token
          .connect(buyer)
          .emergencyWithdraw(
            testToken.target,
            buyer.address,
            ethers.parseEther("500")
          )
      ).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });

    it("Should prevent emergencyWithdraw if token address is zero address", async function () {
      const { token, defaultAdmin, anotherAccount } = await loadFixture(
        deployZodaxFixture
      );

      await expect(
        token
          .connect(defaultAdmin)
          .emergencyWithdraw(
            ethers.ZeroAddress,
            anotherAccount.address,
            ethers.parseEther("500")
          )
      ).to.be.revertedWith("Invalid token");
    });

    it("Should prevent emergencyWithdraw if recipient address is zero address", async function () {
      const { token, defaultAdmin } = await loadFixture(deployZodaxFixture);

      const TestToken = await ethers.getContractFactory("TestToken");
      const testToken = await TestToken.deploy();

      await testToken.mint(token.target, ethers.parseEther("500"));

      await expect(
        token
          .connect(defaultAdmin)
          .emergencyWithdraw(testToken.target, ethers.ZeroAddress, 1000)
      ).to.be.revertedWith("Invalid recipient");
    });

    it("Should revert if emergencyWithdraw amount exceeds balance", async function () {
      const { token, defaultAdmin, anotherAccount } = await loadFixture(
        deployZodaxFixture
      );

      const TestToken = await ethers.getContractFactory("TestToken");
      const testToken = await TestToken.deploy();

      await testToken.mint(token.target, ethers.parseEther("500"));

      await expect(
        token
          .connect(defaultAdmin)
          .emergencyWithdraw(
            testToken.target,
            anotherAccount.address,
            ethers.parseEther("1000")
          )
      ).to.be.revertedWithCustomError(token, "ERC20InsufficientBalance");
    });

    it("Should prevent emergencyWithdraw if amount is zero", async function () {
      const { token, defaultAdmin, anotherAccount } = await loadFixture(
        deployZodaxFixture
      );

      const TestToken = await ethers.getContractFactory("TestToken");
      const testToken = await TestToken.deploy();

      await testToken.mint(token.target, ethers.parseEther("500"));

      await expect(
        token
          .connect(defaultAdmin)
          .emergencyWithdraw(testToken.target, anotherAccount.address, 0)
      ).to.be.revertedWith("Invalid amount");
    });
  });

  describe("Access Control", function () {
    it("Should allow default admin to assign roles", async function () {
      const { token, defaultAdmin, buyer } = await loadFixture(
        deployZodaxFixture
      );

      const PAUSER_ROLE = await token.PAUSER_ROLE();
      await token.connect(defaultAdmin).grantRole(PAUSER_ROLE, buyer.address);

      expect(await token.hasRole(PAUSER_ROLE, buyer.address)).to.be.true;
    });

    it("Should prevent non-admin from assigning roles", async function () {
      const { token, buyer } = await loadFixture(deployZodaxFixture);

      const PAUSER_ROLE = await token.PAUSER_ROLE();

      await expect(
        token.connect(buyer).grantRole(PAUSER_ROLE, buyer.address)
      ).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
});
