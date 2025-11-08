const { ethers } = require('ethers');
const logger = require('./logger');

// Smart Contract ABI (will be updated after deployment)
const SUPPLY_CHAIN_ABI = [
  "function addBatch(string batchId, string cropType, uint256 quantity, string qualityGrade) public returns (bool)",
  "function transferOwnership(string batchId, address newOwner) public returns (bool)",
  "function updateBatchStatus(string batchId, string status) public returns (bool)",
  "function getBatchHistory(string batchId) public view returns (tuple(address owner, uint256 timestamp, string status)[])",
  "function verifyBatch(string batchId) public view returns (bool, address, uint256)",
  "function getBatchDetails(string batchId) public view returns (string, string, uint256, string, address, uint256)",
  "event BatchCreated(string indexed batchId, address indexed farmer, uint256 timestamp)",
  "event OwnershipTransferred(string indexed batchId, address indexed from, address indexed to, uint256 timestamp)",
  "event StatusUpdated(string indexed batchId, string status, uint256 timestamp)",
  "event QualityReportAdded(string indexed batchId, address indexed inspector, string grade, uint256 timestamp)"
];

class BlockchainService {
  constructor() {
    this.provider = null;
    this.wallet = null;
    this.contract = null;
    this.initialized = false;
  }

  // Initialize blockchain connection
  async initialize() {
    try {
      if (this.initialized) {
        return true;
      }

      // Check if blockchain configuration is provided
      if (!process.env.BLOCKCHAIN_RPC_URL || !process.env.PRIVATE_KEY) {
        logger.warn('⚠️ Blockchain configuration not found. Running in database-only mode.');
        return false;
      }

      // Create provider
      this.provider = new ethers.JsonRpcProvider(process.env.BLOCKCHAIN_RPC_URL);

      // Create wallet
      this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);

      // Check if contract address is provided
      if (process.env.CONTRACT_ADDRESS) {
        this.contract = new ethers.Contract(
          process.env.CONTRACT_ADDRESS,
          SUPPLY_CHAIN_ABI,
          this.wallet
        );

        // Test connection
        const network = await this.provider.getNetwork();
        logger.info(`✅ Blockchain connected to ${network.name} (ChainId: ${network.chainId})`);
        logger.info(`📝 Contract address: ${process.env.CONTRACT_ADDRESS}`);
        logger.info(`👛 Wallet address: ${this.wallet.address}`);
      } else {
        logger.warn('⚠️ Contract address not provided. Deploy smart contract first.');
      }

      this.initialized = true;
      return true;
    } catch (error) {
      logger.error('❌ Blockchain initialization failed:', error.message);
      return false;
    }
  }

  // Add new batch to blockchain
  async addBatch(batchId, cropType, quantity, qualityGrade) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const tx = await this.contract.addBatch(
        batchId,
        cropType,
        ethers.parseUnits(quantity.toString(), 0),
        qualityGrade
      );

      logger.info(`⏳ Transaction sent: ${tx.hash}`);
      const receipt = await tx.wait();
      logger.info(`✅ Batch ${batchId} added to blockchain. Gas used: ${receipt.gasUsed.toString()}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
    } catch (error) {
      logger.error('Blockchain addBatch error:', error.message);
      throw error;
    }
  }

  // Transfer batch ownership
  async transferOwnership(batchId, newOwnerAddress) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const tx = await this.contract.transferOwnership(batchId, newOwnerAddress);
      const receipt = await tx.wait();

      logger.info(`✅ Ownership of ${batchId} transferred to ${newOwnerAddress}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Blockchain transferOwnership error:', error.message);
      throw error;
    }
  }

  // Update batch status
  async updateBatchStatus(batchId, status) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const tx = await this.contract.updateBatchStatus(batchId, status);
      const receipt = await tx.wait();

      logger.info(`✅ Status of ${batchId} updated to ${status}`);

      return {
        success: true,
        txHash: receipt.hash,
        blockNumber: receipt.blockNumber
      };
    } catch (error) {
      logger.error('Blockchain updateBatchStatus error:', error.message);
      throw error;
    }
  }

  // Get batch history from blockchain
  async getBatchHistory(batchId) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const history = await this.contract.getBatchHistory(batchId);

      return history.map(record => ({
        owner: record.owner,
        timestamp: new Date(Number(record.timestamp) * 1000),
        status: record.status
      }));
    } catch (error) {
      logger.error('Blockchain getBatchHistory error:', error.message);
      throw error;
    }
  }

  // Verify batch authenticity
  async verifyBatch(batchId) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const [exists, currentOwner, createdAt] = await this.contract.verifyBatch(batchId);

      return {
        exists,
        currentOwner,
        createdAt: new Date(Number(createdAt) * 1000),
        verified: exists
      };
    } catch (error) {
      logger.error('Blockchain verifyBatch error:', error.message);
      throw error;
    }
  }

  // Get batch details from blockchain
  async getBatchDetails(batchId) {
    try {
      if (!this.contract) {
        throw new Error('Smart contract not initialized');
      }

      const [cropType, qualityGrade, quantity, status, owner, createdAt] = 
        await this.contract.getBatchDetails(batchId);

      return {
        cropType,
        qualityGrade,
        quantity: quantity.toString(),
        status,
        owner,
        createdAt: new Date(Number(createdAt) * 1000)
      };
    } catch (error) {
      logger.error('Blockchain getBatchDetails error:', error.message);
      throw error;
    }
  }

  // Listen to blockchain events
  setupEventListeners() {
    if (!this.contract) {
      logger.warn('Cannot set up event listeners: contract not initialized');
      return;
    }

    // Listen to BatchCreated events
    this.contract.on('BatchCreated', (batchId, farmer, timestamp, event) => {
      logger.info(`📦 New batch created: ${batchId} by ${farmer}`);
    });

    // Listen to OwnershipTransferred events
    this.contract.on('OwnershipTransferred', (batchId, from, to, timestamp, event) => {
      logger.info(`🔄 Ownership transferred: ${batchId} from ${from} to ${to}`);
    });

    // Listen to StatusUpdated events
    this.contract.on('StatusUpdated', (batchId, status, timestamp, event) => {
      logger.info(`📝 Status updated: ${batchId} -> ${status}`);
    });

    logger.info('👂 Blockchain event listeners activated');
  }

  // Check if blockchain is available
  isAvailable() {
    return this.initialized && this.contract !== null;
  }

  // Get wallet balance
  async getBalance() {
    try {
      if (!this.wallet) {
        return '0';
      }
      const balance = await this.provider.getBalance(this.wallet.address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting wallet balance:', error.message);
      return '0';
    }
  }
}

// Create singleton instance
const blockchainService = new BlockchainService();

module.exports = blockchainService;
