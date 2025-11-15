import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateCustomerInput {
  name: string; // Will be split into firstName and lastName
  email?: string;
  phone?: string;
  address?: string; // Will be stored as a default address
}

export interface UpdateCustomerInput {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
}

export class CustomerService {
  /**
   * Generate a unique customer code
   */
  private async generateCustomerCode(): Promise<string> {
    const prefix = 'CUST';
    let counter = 1;
    let customerCode = `${prefix}${counter.toString().padStart(6, '0')}`;

    // Find the highest existing customer code
    const lastCustomer = await prisma.customer.findFirst({
      where: {
        customerCode: {
          startsWith: prefix,
        },
      },
      orderBy: {
        customerCode: 'desc',
      },
    });

    if (lastCustomer) {
      const lastNumber = parseInt(lastCustomer.customerCode.replace(prefix, ''), 10);
      counter = lastNumber + 1;
      customerCode = `${prefix}${counter.toString().padStart(6, '0')}`;
    }

    // Ensure uniqueness
    while (await prisma.customer.findUnique({ where: { customerCode } })) {
      counter++;
      customerCode = `${prefix}${counter.toString().padStart(6, '0')}`;
    }

    return customerCode;
  }

  /**
   * Split name into firstName and lastName
   */
  private splitName(name: string): { firstName: string; lastName: string } {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) {
      return { firstName: parts[0], lastName: '' };
    }
    const lastName = parts.pop() || '';
    const firstName = parts.join(' ');
    return { firstName, lastName };
  }

  /**
   * Parse address string into address components
   */
  private parseAddress(address: string): {
    street1: string;
    city: string;
    state: string;
    postalCode: string;
    country: string;
  } {
    // Simple parsing - can be enhanced later
    const parts = address.split(',').map(p => p.trim());
    
    return {
      street1: parts[0] || '',
      city: parts[1] || '',
      state: parts[2] || '',
      postalCode: parts[3] || '',
      country: parts[4] || 'US', // Default to US
    };
  }

  /**
   * Create a new customer
   */
  async createCustomer(input: CreateCustomerInput) {
    const { firstName, lastName } = this.splitName(input.name);
    const customerCode = await this.generateCustomerCode();

    // Create customer
    const customer = await prisma.customer.create({
      data: {
        customerCode,
        firstName,
        lastName,
        email: input.email || null,
        phone: input.phone || null,
      },
    });

    // Create default address if provided
    if (input.address) {
      const addressData = this.parseAddress(input.address);
      await prisma.customerAddress.create({
        data: {
          customerId: customer.id,
          addressType: 'Both',
          street1: addressData.street1,
          city: addressData.city,
          state: addressData.state,
          postalCode: addressData.postalCode,
          country: addressData.country,
          isDefault: true,
        },
      });
    }

    // Return customer with address
    return await prisma.customer.findUnique({
      where: { id: customer.id },
      include: {
        addresses: true,
      },
    });
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(id: string, input: UpdateCustomerInput) {
    const existingCustomer = await prisma.customer.findUnique({
      where: { id },
      include: { addresses: true },
    });

    if (!existingCustomer) {
      throw new Error('Customer not found');
    }

    const updateData: any = {};

    if (input.name !== undefined) {
      const { firstName, lastName } = this.splitName(input.name);
      updateData.firstName = firstName;
      updateData.lastName = lastName;
    }

    if (input.email !== undefined) {
      updateData.email = input.email || null;
    }

    if (input.phone !== undefined) {
      updateData.phone = input.phone || null;
    }

    // Update customer
    const customer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // Update or create default address if provided
    if (input.address !== undefined) {
      const addressData = this.parseAddress(input.address);
      const defaultAddress = existingCustomer.addresses.find(addr => addr.isDefault);

      if (defaultAddress) {
        // Update existing default address
        await prisma.customerAddress.update({
          where: { id: defaultAddress.id },
          data: {
            street1: addressData.street1,
            city: addressData.city,
            state: addressData.state,
            postalCode: addressData.postalCode,
            country: addressData.country,
          },
        });
      } else if (input.address) {
        // Create new default address
        await prisma.customerAddress.create({
          data: {
            customerId: customer.id,
            addressType: 'Both',
            street1: addressData.street1,
            city: addressData.city,
            state: addressData.state,
            postalCode: addressData.postalCode,
            country: addressData.country,
            isDefault: true,
          },
        });
      }
    }

    // Return updated customer with address
    return await prisma.customer.findUnique({
      where: { id: customer.id },
      include: {
        addresses: true,
      },
    });
  }

  /**
   * Get all customers
   */
  async getAllCustomers() {
    const customers = await prisma.customer.findMany({
      include: {
        addresses: {
          where: { isDefault: true },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return customers;
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        addresses: true,
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return customer;
  }

  /**
   * Delete a customer
   */
  async deleteCustomer(id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Delete customer (addresses will be cascade deleted)
    await prisma.customer.delete({
      where: { id },
    });

    return { success: true };
  }
}

export const customerService = new CustomerService();

